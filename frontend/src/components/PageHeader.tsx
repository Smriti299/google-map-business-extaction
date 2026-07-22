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
    <section className="mb-4 overflow-hidden rounded-[24px] border border-slate-200/70 bg-white/80 shadow-[0_12px_40px_-30px_rgba(15,23,42,0.75)] backdrop-blur sm:mb-6 sm:rounded-[28px]">
      <div className="bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_24%),linear-gradient(180deg,_rgba(255,255,255,0.98),_rgba(248,250,252,0.96))] px-4 py-4 sm:px-6 sm:py-5 lg:px-7">
        <div className="flex flex-col gap-3 sm:gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-cyan-700 sm:text-[11px]">
              {eyebrow}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 sm:mt-3 sm:text-[2rem]">
              {title}
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 sm:text-[15px]">
              {description}
            </p>
          </div>

          {actions ? <div className="flex flex-wrap items-center gap-3">{actions}</div> : null}
        </div>

        {metrics.length > 0 ? (
          <div className="mt-4 grid gap-2 sm:mt-5 sm:grid-cols-2 sm:gap-3 xl:grid-cols-4">
            {metrics.map((metric) => (
              <div
                key={metric.label}
                className="rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm"
              >
                <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
                  {metric.label}
                </div>
                <div className="mt-1 text-xl font-semibold text-slate-950 sm:mt-2 sm:text-2xl">{metric.value}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export default PageHeader;
