import { ReactNode } from "react";

type Metric = {
  label: string;
  value: ReactNode;
};

type PageHeaderProps = {
  eyebrow: string;
  title: string;
  description: string;
  metrics?: Metric[];
  actions?: ReactNode;
};

function PageHeader({ eyebrow, title, description, metrics = [], actions }: PageHeaderProps) {
  return (
    <section className="sticky top-0 z-20 mb-6 overflow-hidden rounded-[28px] border border-slate-200/70 bg-white/80 shadow-[0_18px_50px_-36px_rgba(15,23,42,0.75)] backdrop-blur">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] px-5 py-5 sm:px-6 lg:px-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-700">
              {eyebrow}
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-[2rem]">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              {description}
            </p>
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>

        {metrics.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm"
              >
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  {metric.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-slate-950">{metric.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default PageHeader;
