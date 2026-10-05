using Garage.FastReportDesigner;

if (args.Length != 4 || args[0] != "--render") return 2;
return ReportRenderer.Render(args[1], args[2], args[3]);
