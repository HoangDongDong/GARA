import { useEffect, useRef, useState } from 'react';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

export default function ReportPdfPreview({ url }) {
  const container = useRef(null), [error, setError] = useState(''), [loading, setLoading] = useState(true);
  useEffect(() => {
    let alive = true, task;
    const target = container.current;
    target.replaceChildren(); setLoading(true); setError('');
    (async () => {
      const pdfjs = await import('pdfjs-dist/build/pdf.mjs');
      if (!alive) return;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      task = pdfjs.getDocument({ url });
      const pdf = await task.promise;
      for (let index = 1; index <= pdf.numPages && alive; index++) {
        const page = await pdf.getPage(index), base = page.getViewport({ scale: 1 });
        const scale = Math.min(2, 1400 / base.width), viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        canvas.setAttribute('aria-label', `Trang PDF ${index}`); canvas.setAttribute('role', 'img');
        if (!alive) return;
        target.appendChild(canvas);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
      }
      if (alive) setLoading(false);
    })().catch(err => { if (alive) { setLoading(false); setError(`Không hiển thị được PDF: ${err.message}`); } });
    return () => { alive = false; task?.destroy(); };
  }, [url]);
  return <div className="wrd-pdf-view"><div className="wrd-pdf-actions"><span>{loading ? 'Đang hiển thị PDF…' : 'Bản in từ FastReport · dữ liệu mẫu'}</span><a href={url} download="xem-truoc-mau-in.pdf">Tải PDF</a></div>{error && <p role="alert">{error}</p>}<div className="wrd-pdf-pages" ref={container}/></div>;
}
