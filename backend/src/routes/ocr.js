const express = require('express');
const config = require('../config');
const db = require('../db');

const router = express.Router();
const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const SUPPORTED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']);

const vehicleSchema = {
  type: 'object',
  properties: {
    plate: { type: ['string', 'null'], description: 'Vietnamese license plate, normalized like 51A-123.45.' },
    brand: { type: ['string', 'null'], description: 'Vehicle manufacturer, for example Toyota.' },
    model: { type: ['string', 'null'], description: 'Vehicle model line, for example Corolla Cross.' },
    variant: { type: ['string', 'null'], description: 'Trim, engine or edition visible or reasonably inferable from the image.' },
    year: { type: ['integer', 'null'], description: 'Estimated model year only when reasonably identifiable.' },
    variantEstimated: { type: 'boolean', description: 'True when variant is inferred from appearance instead of directly visible evidence.' },
    yearEstimated: { type: 'boolean', description: 'True when year is inferred from generation or facelift instead of directly visible evidence.' },
    variantConfidence: { type: 'number', description: 'Confidence in variant from 0 to 1.' },
    yearConfidence: { type: 'number', description: 'Confidence in year from 0 to 1.' },
    color: { type: ['string', 'null'], description: 'Exterior color in Vietnamese.' },
    fuel: { type: ['string', 'null'], description: 'One of Xăng, Dầu, Điện, Hybrid, LPG, Khác.' },
    confidence: { type: 'number', description: 'Overall confidence from 0 to 1.' },
    notes: { type: ['string', 'null'], description: 'Short Vietnamese warning about uncertain fields.' },
  },
  required: ['plate', 'brand', 'model', 'variant', 'year', 'variantEstimated', 'yearEstimated',
    'variantConfidence', 'yearConfidence', 'color', 'fuel', 'confidence', 'notes'],
};

function parseImageDataUrl(value) {
  const match = String(value || '').match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\r\n]+)$/);
  if (!match) throw Object.assign(new Error('Ảnh không đúng định dạng base64 data URL.'), { statusCode: 400 });
  const mimeType = match[1].toLowerCase();
  if (!SUPPORTED_MIME.has(mimeType)) {
    throw Object.assign(new Error('Chỉ hỗ trợ ảnh JPEG, PNG, WEBP, HEIC hoặc HEIF.'), { statusCode: 415 });
  }
  const data = match[2].replace(/\s/g, '');
  const byteLength = Buffer.byteLength(data, 'base64');
  if (!byteLength || byteLength > MAX_IMAGE_BYTES) {
    throw Object.assign(new Error('Ảnh rỗng hoặc vượt quá giới hạn 15 MB.'), { statusCode: 413 });
  }
  return { mimeType, data };
}

function normalizeResult(result) {
  const clean = (value) => {
    const text = String(value ?? '').trim();
    return text && !['null', 'unknown', 'không rõ'].includes(text.toLowerCase()) ? text : null;
  };
  const year = Number(result?.year);
  const confidence = (value) => Math.max(0, Math.min(1, Number(value) || 0));
  return {
    plate: clean(result?.plate)?.toUpperCase() || null,
    brand: clean(result?.brand),
    model: clean(result?.model),
    variant: clean(result?.variant),
    year: Number.isInteger(year) && year >= 1950 && year <= new Date().getFullYear() + 1 ? year : null,
    variantEstimated: Boolean(result?.variantEstimated),
    yearEstimated: Boolean(result?.yearEstimated),
    variantConfidence: confidence(result?.variantConfidence),
    yearConfidence: confidence(result?.yearConfidence),
    color: clean(result?.color),
    fuel: clean(result?.fuel),
    confidence: confidence(result?.confidence),
    notes: clean(result?.notes),
  };
}

const comparable = (value) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toUpperCase().replace(/[^A-Z0-9]/g, '');

function bestCatalogMatch(rows, detectedName) {
  const target = comparable(detectedName);
  if (!target) return null;
  return rows.find((row) => comparable(row.NAME) === target)
    || rows.find((row) => comparable(row.NAME).includes(target) || target.includes(comparable(row.NAME)))
    || null;
}

async function resolveCatalog(result, actor) {
  return db.transaction(async (query, execute, uuidv4) => {
    const brands = await query(`SELECT ID, NAME FROM DHANGXE WHERE STATUS=1`);
    let brand = bestCatalogMatch(brands, result.brand);
    let brandCreated = false;
    if (!brand && result.brand) {
      const id = uuidv4();
      const orderRows = await query(`SELECT COUNT(*) + 1 AS NEXT_ORDER FROM DHANGXE`);
      await execute(
        `INSERT INTO DHANGXE (ID, NAME, CODE, SORTORDER, STATUS, USERCREATEDID, TIMECREATED)
         VALUES (?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
        [id, result.brand, comparable(result.brand).slice(0, 40), Number(orderRows[0]?.NEXT_ORDER || 1), actor]
      );
      brand = { ID: id, NAME: result.brand };
      brandCreated = true;
    }

    const models = await query(`SELECT ID, NAME, DHANGXEID FROM DDONGXE WHERE STATUS=1`);
    const modelCandidates = brand ? models.filter((row) => row.DHANGXEID === brand.ID) : models;
    let model = bestCatalogMatch(modelCandidates, result.model);
    let modelCreated = false;
    if (!model && brand && result.model) {
      const id = uuidv4();
      const orderRows = await query(
        `SELECT COUNT(*) + 1 AS NEXT_ORDER FROM DDONGXE WHERE DHANGXEID=?`,
        [brand.ID]
      );
      await execute(
        `INSERT INTO DDONGXE (ID, NAME, CODE, DHANGXEID, SORTORDER, STATUS, USERCREATEDID, TIMECREATED)
         VALUES (?, ?, ?, ?, ?, 1, ?, CURRENT_TIMESTAMP)`,
        [id, result.model, comparable(result.model).slice(0, 40), brand.ID,
          Number(orderRows[0]?.NEXT_ORDER || 1), actor]
      );
      model = { ID: id, NAME: result.model, DHANGXEID: brand.ID };
      modelCreated = true;
    }

    return {
      ...result,
      brandId: brand?.ID || null,
      modelId: model?.ID || null,
      catalogBrand: brand?.NAME || null,
      catalogModel: model?.NAME || null,
      catalogCreated: { brand: brandCreated, model: modelCreated },
    };
  });
}

async function analyzeVehicle(image) {
  if (!config.gemini.apiKey) {
    throw Object.assign(new Error('Backend chưa cấu hình GEMINI_API_KEY.'), { statusCode: 503 });
  }
  const { mimeType, data } = parseImageDataUrl(image);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 55000);
  const models = [...new Set([config.gemini.model, ...config.gemini.fallbackModels])];
  const requestBody = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [
        {
          text: [
            'Phân tích ảnh xe để hỗ trợ tạo hồ sơ tại gara Việt Nam.',
            'Đọc chính xác biển số nếu nhìn thấy; nhận diện hãng, dòng xe, phiên bản, năm sản xuất, màu ngoại thất và nhiên liệu.',
            'Với phiên bản và năm: trước tiên đọc huy hiệu/chữ trên xe; sau đó đối chiếu thế hệ, facelift, đèn, cản, lưới tản nhiệt, mâm và kiểu thân xe.',
            'Nếu không thể xác định chính xác nhưng có cơ sở từ ngoại hình, hãy trả về một phiên bản và một năm hợp lý nhất, đặt variantEstimated/yearEstimated=true và giảm confidence tương ứng.',
            'Chỉ trả về null cho phiên bản hoặc năm khi hoàn toàn không có cơ sở nhận diện. Không bịa thông tin VIN hay thông tin đăng ký.',
            'Chuẩn hóa biển số Việt Nam dạng 51A-123.45. Trả tên màu và nhiên liệu bằng tiếng Việt.',
            'Nhiên liệu chỉ dùng một trong: Xăng, Dầu, Điện, Hybrid, LPG, Khác.',
          ].join(' '),
        },
        { inlineData: { mimeType, data } },
      ],
    }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseJsonSchema: vehicleSchema,
      temperature: 0.1,
      maxOutputTokens: 1024,
    },
  });

  try {
    let lastError = null;
    for (const model of models) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': config.gemini.apiKey,
        },
        body: requestBody,
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const apiMessage = payload?.error?.message || `Gemini API HTTP ${response.status}`;
        lastError = Object.assign(new Error(apiMessage), { statusCode: response.status === 429 ? 429 : 502 });
        const transient = response.status === 429 || response.status === 503 || /high demand|temporar|overload/i.test(apiMessage);
        if (transient && model !== models[models.length - 1]) continue;
        throw lastError;
      }
      const text = payload?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim();
      if (!text) {
        lastError = Object.assign(new Error(`Gemini ${model} không trả về kết quả nhận diện.`), { statusCode: 502 });
        if (model !== models[models.length - 1]) continue;
        throw lastError;
      }
      return { ...normalizeResult(JSON.parse(text)), modelUsed: model };
    }
    throw lastError || Object.assign(new Error('Không có model Gemini khả dụng.'), { statusCode: 502 });
  } catch (error) {
    if (error.name === 'AbortError') {
      throw Object.assign(new Error('Gemini xử lý ảnh quá thời gian 55 giây.'), { statusCode: 504 });
    }
    if (error instanceof SyntaxError) {
      throw Object.assign(new Error('Gemini trả về dữ liệu không đúng cấu trúc.'), { statusCode: 502 });
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

router.get('/health', (req, res) => {
  res.json({ ok: true, provider: 'Google Gemini', model: config.gemini.model, configured: Boolean(config.gemini.apiKey) });
});

router.post('/analyze-vehicle', async (req, res) => {
  try {
    const actor = String(req.accessUser?.USERNAME || req.get('X-User') || 'SYSTEM').trim() || 'SYSTEM';
    const data = await resolveCatalog(await analyzeVehicle(req.body?.image), actor);
    res.json({ ok: true, provider: 'Google Gemini', model: data.modelUsed || config.gemini.model, data });
  } catch (error) {
    res.status(error.statusCode || 500).json({ error: error.message });
  }
});

module.exports = router;
