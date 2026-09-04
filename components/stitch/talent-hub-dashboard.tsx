/**
 * Markup portado desde Stitch (HTML → JSX):
 * .stitch/evalia-hr-app-redesign/html/dashboard-principal-talent-hub.html
 */
import Link from "next/link";

export function StitchTalentHubDashboard() {
  return (
    <div className="flex flex-col w-full gap-space-lg">
    {/* Executive Header */}
    <section className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-space-md p-space-lg rounded-xl bg-surface-container shadow-xl overflow-hidden">
    <div className="absolute -right-16 -top-16 w-80 h-80 rounded-full bg-primary/10 blur-3xl pointer-events-none"></div>
    <div className="absolute -left-20 -bottom-20 w-60 h-60 rounded-full bg-tertiary/10 blur-2xl pointer-events-none"></div>
    <div className="relative z-10 flex flex-col gap-space-2xs max-w-2xl">
    <div className="flex items-center gap-space-xs">
    <span className="inline-flex items-center gap-1.5 px-space-xs py-0.5 rounded-full bg-primary-container/30 text-primary font-label-mono-sm text-label-mono-sm">
    <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
              STREAM TELEMETRÍA EN VIVO
            </span>
    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">| Mod. v4.8 Active Neural</span>
    </div>
    <h1 className="font-headline-xl text-headline-xl font-bold tracking-tight text-on-surface">Panel de Control de Talento &amp; IA</h1>
    <p className="font-body-md text-body-md text-on-surface-variant">Resumen en tiempo real de evaluaciones orales inteligentes, ajuste de candidatos y predicción de desempeño sin sesgo cognitivo.</p>
    </div>
    <div className="relative z-10 flex items-center flex-wrap gap-space-xs">
    <Link href="/reports" className="flex items-center gap-1.5 px-space-sm h-9 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-body-sm text-body-sm transition-all shadow-sm">
    <span className="material-symbols-outlined text-[18px]">download</span>
    <span>Exportar Reporte</span>
    </Link>
    <button className="flex items-center gap-1.5 px-space-sm h-9 rounded-lg bg-surface-container-high hover:bg-surface-variant text-on-surface font-body-sm text-body-sm transition-all shadow-sm">
    <span className="material-symbols-outlined text-[18px]">tune</span>
    <span>Filtros Avanzados</span>
    </button>
    <Link href="/interviews/new" className="flex items-center gap-1.5 px-space-md h-9 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary-container font-body-sm text-body-sm font-semibold transition-all shadow-md">
    <span className="material-symbols-outlined text-[18px]">add_circle</span>
    <span>+ Iniciar Proceso</span>
    </Link>
    </div>
    </section>
    {/* KPI Metrics Bar */}
    <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
    {/* KPI 1 */}
    <div className="relative p-space-md rounded-xl bg-surface-container shadow-md flex flex-col justify-between overflow-hidden group hover:bg-surface-container-high transition-all">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-primary-container"></div>
    <div className="flex items-start justify-between">
    <span className="font-label-mono-sm text-label-mono-sm uppercase text-on-surface-variant tracking-wider">Candidatos Evaluados IA</span>
    <div className="p-1.5 rounded-lg bg-primary-container/20 text-primary">
    <span className="material-symbols-outlined text-[20px]">smart_toy</span>
    </div>
    </div>
    <div className="flex items-baseline justify-between mt-space-sm">
    <span className="font-stat-metric text-stat-metric font-bold text-on-surface tracking-tight">1,428</span>
    <span className="inline-flex items-center text-secondary font-label-mono-sm text-label-mono-sm font-medium">
    <span className="material-symbols-outlined text-[14px]">arrow_upward</span>
              +18.4%
            </span>
    </div>
    <div className="mt-space-2xs flex items-center justify-between">
    <span className="font-body-sm text-body-sm text-outline">vs mes anterior</span>
    <div className="w-20 h-5">
    <svg className="w-full h-full text-secondary" fill="none" viewBox="0 0 100 25">
    <path d="M0 20 L20 18 L40 12 L60 15 L80 6 L100 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
    </div>
    </div>
    </div>
    {/* KPI 2 */}
    <div className="relative p-space-md rounded-xl bg-surface-container shadow-md flex flex-col justify-between overflow-hidden group hover:bg-surface-container-high transition-all">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-secondary to-secondary-container"></div>
    <div className="flex items-start justify-between">
    <span className="font-label-mono-sm text-label-mono-sm uppercase text-on-surface-variant tracking-wider">Tiempo Prom. Contratación</span>
    <div className="p-1.5 rounded-lg bg-secondary-container/20 text-secondary">
    <span className="material-symbols-outlined text-[20px]">timer</span>
    </div>
    </div>
    <div className="flex items-baseline justify-between mt-space-sm">
    <span className="font-stat-metric text-stat-metric font-bold text-on-surface tracking-tight">8.2 <span className="text-headline-md font-body-md font-normal text-on-surface-variant">días</span></span>
    <span className="inline-flex items-center text-secondary font-label-mono-sm text-label-mono-sm font-medium">
    <span className="material-symbols-outlined text-[14px]">arrow_downward</span>
              -65%
            </span>
    </div>
    <div className="mt-space-2xs flex items-center justify-between">
    <span className="font-body-sm text-body-sm text-outline">Reducción total con IA</span>
    <div className="w-20 h-5">
    <svg className="w-full h-full text-secondary" fill="none" viewBox="0 0 100 25">
    <path d="M0 4 L20 8 L40 10 L60 18 L80 19 L100 23" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
    </div>
    </div>
    </div>
    {/* KPI 3 */}
    <div className="relative p-space-md rounded-xl bg-surface-container shadow-md flex flex-col justify-between overflow-hidden group hover:bg-surface-container-high transition-all">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-tertiary to-tertiary-container"></div>
    <div className="flex items-start justify-between">
    <span className="font-label-mono-sm text-label-mono-sm uppercase text-on-surface-variant tracking-wider">Ajuste Cultural &amp; Técnico</span>
    <div className="p-1.5 rounded-lg bg-tertiary-container/20 text-tertiary">
    <span className="material-symbols-outlined text-[20px]">psychology</span>
    </div>
    </div>
    <div className="flex items-baseline justify-between mt-space-sm">
    <span className="font-stat-metric text-stat-metric font-bold text-on-surface tracking-tight">89.2%</span>
    <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-mono-sm text-label-mono-sm font-medium">
              Top Benchmark
            </span>
    </div>
    <div className="mt-space-2xs flex items-center justify-between">
    <span className="font-body-sm text-body-sm text-outline">Calibración +4.2 pts</span>
    <div className="w-20 h-5">
    <svg className="w-full h-full text-tertiary" fill="none" viewBox="0 0 100 25">
    <path d="M0 16 L25 14 L50 9 L75 11 L100 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" />
    </svg>
    </div>
    </div>
    </div>
    {/* KPI 4 */}
    <div className="relative p-space-md rounded-xl bg-surface-container shadow-md flex flex-col justify-between overflow-hidden group hover:bg-surface-container-high transition-all">
    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary to-tertiary"></div>
    <div className="flex items-start justify-between">
    <span className="font-label-mono-sm text-label-mono-sm uppercase text-on-surface-variant tracking-wider">Entrevistas de Voz IA</span>
    <div className="p-1.5 rounded-lg bg-primary-container/20 text-primary">
    <span className="material-symbols-outlined text-[20px]">mic</span>
    </div>
    </div>
    <div className="flex items-baseline justify-between mt-space-sm">
    <span className="font-stat-metric text-stat-metric font-bold text-on-surface tracking-tight">342</span>
    <span className="inline-flex items-center text-on-surface-variant font-label-mono-sm text-label-mono-sm">
              esta semana
            </span>
    </div>
    <div className="mt-space-2xs flex items-center justify-between">
    <span className="font-body-sm text-body-sm text-secondary font-medium">99.4% satisfacción</span>
    <span className="font-label-mono-sm text-label-mono-sm text-outline">Latencia 128ms</span>
    </div>
    </div>
    </section>
    {/* Main Content Split Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
    {/* Left / Primary Column (approx 70% -> 8 of 12 cols or 7 of 12) */}
    <div className="lg:col-span-8 flex flex-col gap-space-lg min-w-0">
    {/* Procesos Activos con Agentes de Voz */}
    <section className="flex flex-col gap-space-sm">
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-space-xs">
    <span className="material-symbols-outlined text-primary text-[20px]">record_voice_over</span>
    <h2 className="font-headline-md text-headline-md text-on-surface">Procesos Activos con Agentes de Voz</h2>
    <span className="px-2 py-0.5 rounded-full bg-surface-container-high text-on-surface font-label-mono-sm text-label-mono-sm font-semibold">3 en vivo</span>
    </div>
    <Link className="font-body-sm text-body-sm text-primary hover:underline flex items-center gap-1" href="/jobs">
                Ver todas las vacantes
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
    </Link>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
    {/* Card 1 */}
    <div className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high shadow-sm flex flex-col justify-between transition-all group">
    <div className="flex flex-col gap-space-2xs">
    <div className="flex items-center justify-between">
    <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-mono-sm text-label-mono-sm font-medium flex items-center gap-1">
    <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                      Agente Activo
                    </span>
    <span className="font-label-mono-sm text-label-mono-sm text-outline">ID #402</span>
    </div>
    <h3 className="font-headline-md text-headline-md text-on-surface font-bold mt-1 group-hover:text-primary transition-colors leading-snug">Senior Fullstack Engineer</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant">Voice IA en curso: 42 evaluados, 5 finalistas</p>
    </div>
    <div className="mt-space-md flex flex-col gap-space-xs">
    <div className="flex items-center justify-between font-label-mono-sm text-label-mono-sm">
    <span className="text-outline">Top Match Score</span>
    <span className="text-secondary font-bold">94% Precisión</span>
    </div>
    <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden">
    <div className="h-full bg-secondary rounded-full" style={{width: '94%'}}></div>
    </div>
    <div className="flex items-center justify-between pt-space-xs">
    <div className="flex -space-x-2 overflow-hidden">
    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-container object-cover" data-alt="Close-up professional portrait of a software engineer candidate with subtle tech background, neutral expression, modern corporate lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDk31muQ7PbEAVHNMUsnmE8wgfRK9D5Fg634nXKzYjaEvIGWz3wUVOsXI7mZdoWn6T2yi5yrD8Ku8nxZzWRLq3GI5cETJNfQ_Vl1gr3HdtzYro3ytIj5a_MT-TVB9IHA5sKoLKLvUJ1GCNAychwLbtUv8u8NkIiGCOPbYSWINH3ZWbGAKnSIYBw0yiIT0FzsGLFtNGP6OWGlm5e6_SzSDxG28dq2ykOIKAO5uYl0iPaRSqYVBwl6o9u" />
    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-container object-cover" data-alt="Portrait of a female engineering applicant in front of modern workstation, sharp focus, cinematic dark lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAtWZkCr4bXCtaXH_TRFuz4xYw_Wk2E6tJsn20KozGGI4iNl8i9Zs2xgOTfSyRzIoFl2ruGoPYyNl4c2TWwtcZVPU1wWkApc6TlV1SeAGqMY77-Bsth5pE1lCOU88Ozi6Eho9lux9iNrkiKHN1kUZ0SsUdRP9gC_qXgGfrxDuiXeVE-ntJu0XLxttSGagqTQfWJYQhW_-QDok90mpaY30aULCpY6CKMLW5qbOfxjH5WbVCTfm1aHtGG" />
    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-container object-cover" data-alt="Studio headshot of a senior technology specialist candidate with eyeglasses and professional attire, high contrast" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBIX4MlMqg8qdf5TwvQ7MFC9WwE4vCUTD1AjixboIgkfcO8uzwDUXety3qK0F2d5jK5SqpN8aW8I9ET1AiwMsXw1hUehh4dXMusI-zvbB1wAGjpvyDFWopnv6HeKR8l2zifutd_HDAzU_cMnr1i3mlMippdP2BFqf3YUakJLYbA2lUawgZ6mnfvngQ72H185xSZ8byCNx-0Mab5Nl0LOMhKMDDDyT2TBj1RtynIkICzQhLgx207T06K" />
    <div className="h-6 w-6 rounded-full bg-surface-container-highest flex items-center justify-center font-label-mono-sm text-[10px] text-on-surface">+39</div>
    </div>
    <button className="px-space-xs py-1 rounded bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface-variant font-label-mono-sm text-label-mono-sm transition-all flex items-center gap-1">
    <span>Auditar</span>
    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
    </button>
    </div>
    </div>
    </div>
    {/* Card 2 */}
    <div className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high shadow-sm flex flex-col justify-between transition-all group">
    <div className="flex flex-col gap-space-2xs">
    <div className="flex items-center justify-between">
    <span className="px-2 py-0.5 rounded-full bg-tertiary-container/30 text-tertiary font-label-mono-sm text-label-mono-sm font-medium flex items-center gap-1">
    <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
                      Conductual
                    </span>
    <span className="font-label-mono-sm text-label-mono-sm text-outline">ID #389</span>
    </div>
    <h3 className="font-headline-md text-headline-md text-on-surface font-bold mt-1 group-hover:text-primary transition-colors leading-snug">Product Marketing Lead</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant">Entrevista oral situacional: 28 evaluados</p>
    </div>
    <div className="mt-space-md flex flex-col gap-space-xs">
    <div className="flex items-center justify-between font-label-mono-sm text-label-mono-sm">
    <span className="text-outline">Top Match Score</span>
    <span className="text-tertiary font-bold">91% Precisión</span>
    </div>
    <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden">
    <div className="h-full bg-tertiary rounded-full" style={{width: '91%'}}></div>
    </div>
    <div className="flex items-center justify-between pt-space-xs">
    <div className="flex -space-x-2 overflow-hidden">
    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-container object-cover" data-alt="Portrait of a female product marketing executive speaking confidently in a clean architectural studio office" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5KY4dgasbHs5yWJ7TPCmeL5NBH1VoJBXoambYCrKgHOlbH8_OhNW64J5wXFDs-cXMpwDG6-dUAGWX5lOHZfRjaZuEeQuGAFJbFmOHJEXxiP5kt2eXKAicdZI9x0t0yINZEDGe63Czwae6pFbTwoTwCL53t4Uyvw__hbkXFg1uNOxko9izuhXyxkZjSCnGM6ZkdqEZUFx8w068uu8y4pUj7rO-Efj6R-KCXwh_Mf5wcZiFTYaiiwJF" />
    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-container object-cover" data-alt="Professional marketing strategist headshot, smiling warmly with clean high-contrast rim lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA4IFZixQRX3AR1iPjCspuIJeqAnCGg7gjmk71d26ZJP7LsPF6_Qs4scTXgE1Ho9vleDS5HrCJQ5OBjPwd1lyKjnL_UaeuldY3IvrhlrBJrvDRzbPAGpWion9xubOCe5J2tSvsSe1RV_Bg0_iZhActPgudmAFgEMh-IZ55MBpqYMycYhlbvhidY_aobi9SyvIMVvwz3rfuw7arB-P8aY7ldRwAIsDFLutkLR9KNJHEBczWKo7dEBfaR" />
    <div className="h-6 w-6 rounded-full bg-surface-container-highest flex items-center justify-center font-label-mono-sm text-[10px] text-on-surface">+26</div>
    </div>
    <button className="px-space-xs py-1 rounded bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface-variant font-label-mono-sm text-label-mono-sm transition-all flex items-center gap-1">
    <span>Auditar</span>
    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
    </button>
    </div>
    </div>
    </div>
    {/* Card 3 */}
    <div className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high shadow-sm flex flex-col justify-between transition-all group">
    <div className="flex flex-col gap-space-2xs">
    <div className="flex items-center justify-between">
    <span className="px-2 py-0.5 rounded-full bg-primary-container/30 text-primary font-label-mono-sm text-label-mono-sm font-medium flex items-center gap-1">
    <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      Prueba Técnica
                    </span>
    <span className="font-label-mono-sm text-label-mono-sm text-outline">ID #415</span>
    </div>
    <h3 className="font-headline-md text-headline-md text-on-surface font-bold mt-1 group-hover:text-primary transition-colors leading-snug">Data Scientist LLMs</h3>
    <p className="font-body-sm text-body-sm text-on-surface-variant">Prueba verbal interactiva: 19 evaluados</p>
    </div>
    <div className="mt-space-md flex flex-col gap-space-xs">
    <div className="flex items-center justify-between font-label-mono-sm text-label-mono-sm">
    <span className="text-outline">Top Match Score</span>
    <span className="text-primary font-bold">88% Precisión</span>
    </div>
    <div className="w-full h-1.5 bg-surface-container-lowest rounded-full overflow-hidden">
    <div className="h-full bg-primary rounded-full" style={{width: '88%'}}></div>
    </div>
    <div className="flex items-center justify-between pt-space-xs">
    <div className="flex -space-x-2 overflow-hidden">
    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-container object-cover" data-alt="Portrait of an AI researcher and data scientist in contemporary research studio with blue and violet accent lights" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBaw9THNXmOJghTYzNRkGGHs-O9Dah72ktfpckGlUAbsDaHo_xDp1lqhsm9GFKkck_fv8m0r0Vh1N6Lg-48669o2yEQesSi9ixGWXIvpBvEpeMdv4_jei2o66-_exTi3wbq0KliQYOISSTIpPBIa5rQHjsso4SdaMOvRr89AKjkdY5u5V_z8LzPR-RuuiLc74UsObw3eOpcm0HbUzHw08mANZenCJiMoxgi2cO2Iu27PD_wh0nIx2mW" />
    <img className="inline-block h-6 w-6 rounded-full ring-2 ring-surface-container object-cover" data-alt="Headshot of machine learning engineer candidate, intelligent and attentive look, minimalist studio background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAzMOtPmM5tJ5B5o0R7DJJGH3NuLKOBNhgxQgiBj0d3Ufgt5vTut53MkFjV8io3W9DLpc0z5G4xqE6ccFuSjSojGWcM0GPfXKkMfySF7ajqcgW-iwFLXZlAbibQEOaQnt2foBJo1jtvzgUPF3XrheflPkRkwL88GuiwsaICbCtQSB6kruFXEahfgKfToc6D-NB7CFifyNFNK7Tgy2jQo8dcmmsNqroJuqUPKHtbtYk2AyOTsfJBzUT0" />
    <div className="h-6 w-6 rounded-full bg-surface-container-highest flex items-center justify-center font-label-mono-sm text-[10px] text-on-surface">+17</div>
    </div>
    <button className="px-space-xs py-1 rounded bg-surface-container-highest hover:bg-primary hover:text-on-primary text-on-surface-variant font-label-mono-sm text-label-mono-sm transition-all flex items-center gap-1">
    <span>Auditar</span>
    <span className="material-symbols-outlined text-[14px]">chevron_right</span>
    </button>
    </div>
    </div>
    </div>
    </div>
    </section>
    {/* Candidatos Recientes Evaluados por IA (Live Feed) */}
    <section className="flex flex-col gap-space-sm">
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-space-xs">
    <span className="material-symbols-outlined text-secondary text-[20px]">graphic_eq</span>
    <h2 className="font-headline-md text-headline-md text-on-surface">Candidatos Recientes Evaluados por IA</h2>
    <span className="font-label-mono-sm text-label-mono-sm text-on-surface-variant">(Live Telemetry Feed)</span>
    </div>
    <div className="flex items-center gap-space-xs">
    <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
    <span className="font-label-mono-sm text-label-mono-sm text-secondary">Auto-sync 15s</span>
    </div>
    </div>
    {/* Candidate Row 1 */}
    <div className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high shadow-sm transition-all flex flex-col gap-space-sm">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
    <div className="flex items-center gap-space-sm">
    <div className="relative">
    <img className="w-11 h-11 rounded-full object-cover shadow-sm" data-alt="Professional headshot of a Hispanic senior software engineer with warm confident smile, studio lighting with navy and cyan hues" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDxJXoVQipBFaMqpMTbeQ0EXO9hCAuv4RNbm2obnoDm0EwPEQmFIjEg0RWhHkqOrrkNJz95apOEEZRcZhJHA6iHReTqbPpdRJS1bUaKgGxieNEiR04OEuJgydcXTgXQBM9pcHolCS7ylrKDjqmNvIHHobWeGVJjiHYBeb-6EItweG1bWppjxcc2lVaxNZ6oDnWyF_bcUyi0KQAVjXhoVkPVx8ErRenJDM6M4QYblHuMDhpQIj3KpFyH" />
    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-secondary text-surface-container-lowest font-bold text-[9px] rounded-full flex items-center justify-center">IA</span>
    </div>
    <div className="flex flex-col">
    <div className="flex items-center gap-space-xs">
    <span className="font-headline-md text-headline-md font-bold text-on-surface">Santiago Morales</span>
    <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-mono-sm text-label-mono-sm font-semibold">96% AI Fit</span>
    </div>
    <span className="font-body-sm text-body-sm text-on-surface-variant">Senior Fullstack Engineer • Evaluado hace 12 min</span>
    </div>
    </div>
    <div className="flex items-center gap-space-xs self-start sm:self-auto">
    <span className="px-2.5 py-1 rounded-full bg-secondary-container/30 text-secondary font-label-mono-sm text-label-mono-sm font-semibold flex items-center gap-1">
    <span className="material-symbols-outlined text-[14px]">verified</span>
                    Avanzar a Oferta
                  </span>
    </div>
    </div>
    {/* Waveform Snippet + Competencies */}
    <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
    <div className="flex items-center gap-space-sm flex-1 min-w-0">
    <button className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-on-primary hover:bg-primary/90 transition-transform active:scale-95 flex-shrink-0">
    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
    </button>
    {/* Mini Audio Waveform */}
    <div className="flex items-center gap-0.5 h-6 flex-1 max-w-xs overflow-hidden">
    <span className="w-1 bg-tertiary h-3 rounded-full"></span>
    <span className="w-1 bg-tertiary h-5 rounded-full"></span>
    <span className="w-1 bg-tertiary h-4 rounded-full"></span>
    <span className="w-1 bg-tertiary h-6 rounded-full"></span>
    <span className="w-1 bg-tertiary h-2 rounded-full"></span>
    <span className="w-1 bg-primary h-5 rounded-full"></span>
    <span className="w-1 bg-primary h-6 rounded-full"></span>
    <span className="w-1 bg-primary h-3 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-4 rounded-full"></span>
    <span className="w-1 bg-secondary h-5 rounded-full"></span>
    <span className="w-1 bg-secondary h-6 rounded-full"></span>
    <span className="w-1 bg-secondary h-4 rounded-full"></span>
    <span className="w-1 bg-secondary h-2 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-3 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-tertiary h-4 rounded-full"></span>
    <span className="w-1 bg-tertiary h-5 rounded-full"></span>
    <span className="w-1 bg-tertiary h-3 rounded-full"></span>
    </div>
    <span className="font-label-mono-sm text-label-mono-sm text-outline whitespace-nowrap">03:42 min auditados</span>
    </div>
    {/* Competency Tags */}
    <div className="flex flex-wrap items-center gap-1.5">
    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">Arquitectura Cloud</span>
    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">Liderazgo Adaptativo</span>
    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">Claridad Verbal: Alta</span>
    </div>
    </div>
    <div className="flex items-center justify-between text-body-sm text-body-sm pt-space-2xs">
    <p className="text-on-surface-variant italic truncate max-w-lg">“Demostró síntesis sobresaliente al explicar desacoplamiento de microservicios bajo alta concurrencia.”</p>
    <button className="font-label-mono-sm text-label-mono-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 whitespace-nowrap">
    <span>Ver Diagnóstico Completo</span>
    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
    </button>
    </div>
    </div>
    {/* Candidate Row 2 */}
    <div className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high shadow-sm transition-all flex flex-col gap-space-sm">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
    <div className="flex items-center gap-space-sm">
    <div className="relative">
    <img className="w-11 h-11 rounded-full object-cover shadow-sm" data-alt="Corporate headshot of a woman in technology marketing with friendly expressions, clean background, indigo accents" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDDfw6kDNfmpbJNkbcj0p_zCxqnYX-s0cSwCcPTeh2VV9RVeEis5Ir1KGvvhdMs6NWZ7fHScD_m8svD1GQduIuTmPsDg1jZR_KW36VpQ_Eol3P7tMDYZPil4QPQc3Vfunr21oPiYijrtcNID-tyTwYhip0EDVX4AF2SoqVDQQPANZaBd3HFlv10UV286DFfTpVBuSf-5UgxGbS3NHSlwxg_gp1jPAqebRpxyRe9D4yQ6d_U1W1tsNSq" />
    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-tertiary text-surface-container-lowest font-bold text-[9px] rounded-full flex items-center justify-center">IA</span>
    </div>
    <div className="flex flex-col">
    <div className="flex items-center gap-space-xs">
    <span className="font-headline-md text-headline-md font-bold text-on-surface">Camila Rivas</span>
    <span className="px-2 py-0.5 rounded-full bg-tertiary-container/30 text-tertiary font-label-mono-sm text-label-mono-sm font-semibold">91% AI Fit</span>
    </div>
    <span className="font-body-sm text-body-sm text-on-surface-variant">Product Marketing Lead • Evaluado hace 45 min</span>
    </div>
    </div>
    <div className="flex items-center gap-space-xs self-start sm:self-auto">
    <span className="px-2.5 py-1 rounded-full bg-primary-container/30 text-primary font-label-mono-sm text-label-mono-sm font-semibold flex items-center gap-1">
    <span className="material-symbols-outlined text-[14px]">psychology</span>
                    Revisión Humana
                  </span>
    </div>
    </div>
    {/* Waveform Snippet + Competencies */}
    <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
    <div className="flex items-center gap-space-sm flex-1 min-w-0">
    <button className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-transform active:scale-95 flex-shrink-0">
    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
    </button>
    {/* Mini Audio Waveform */}
    <div className="flex items-center gap-0.5 h-6 flex-1 max-w-xs overflow-hidden">
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-4 rounded-full"></span>
    <span className="w-1 bg-tertiary h-5 rounded-full"></span>
    <span className="w-1 bg-tertiary h-6 rounded-full"></span>
    <span className="w-1 bg-tertiary h-3 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-primary h-5 rounded-full"></span>
    <span className="w-1 bg-primary h-4 rounded-full"></span>
    <span className="w-1 bg-tertiary h-6 rounded-full"></span>
    <span className="w-1 bg-tertiary h-4 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-3 rounded-full"></span>
    <span className="w-1 bg-tertiary h-5 rounded-full"></span>
    <span className="w-1 bg-tertiary h-6 rounded-full"></span>
    <span className="w-1 bg-primary h-3 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-4 rounded-full"></span>
    </div>
    <span className="font-label-mono-sm text-label-mono-sm text-outline whitespace-nowrap">05:14 min auditados</span>
    </div>
    {/* Competency Tags */}
    <div className="flex flex-wrap items-center gap-1.5">
    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">Go-To-Market</span>
    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">Storytelling Verbal</span>
    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">Negociación B2B</span>
    </div>
    </div>
    <div className="flex items-center justify-between text-body-sm text-body-sm pt-space-2xs">
    <p className="text-on-surface-variant italic truncate max-w-lg">“Discurso estructurado y persuasivo en simulaciones de crisis de posicionamiento.”</p>
    <button className="font-label-mono-sm text-label-mono-sm text-primary hover:text-primary/80 font-medium flex items-center gap-1 whitespace-nowrap">
    <span>Ver Diagnóstico Completo</span>
    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
    </button>
    </div>
    </div>
    {/* Candidate Row 3 */}
    <div className="p-space-md rounded-xl bg-surface-container hover:bg-surface-container-high shadow-sm transition-all flex flex-col gap-space-sm opacity-80 hover:opacity-100">
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs">
    <div className="flex items-center gap-space-sm">
    <div className="relative">
    <img className="w-11 h-11 rounded-full object-cover shadow-sm" data-alt="Portrait of an applicant sitting for a remote video interview, soft moody room lighting, tech aesthetic" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBqiGBQOPJpSItaFD3ZOUq6eNnHaYlmyDKW-_cFlP7BHD2s-Vy8Uwguyb5oeg4hNFRoqqYVKGip1pL1FmXkD5G62dvCUQDt1wetKBQ4cE9tJvQvE2p8nTPblaj14W5C3dD2c7FeDdY4qbO2nSwpzrGYG53R7wRtXDclLu-peY2iAWA0UawuQBEc1vo9QNSUaP7kHYCOqyUj0iCaJ2KfGLOaS1KenT4dTUiFBmT42ep0M9yZTasNy2tm" />
    <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-outline text-surface-container-lowest font-bold text-[9px] rounded-full flex items-center justify-center">IA</span>
    </div>
    <div className="flex flex-col">
    <div className="flex items-center gap-space-xs">
    <span className="font-headline-md text-headline-md font-bold text-on-surface">Julián Ortega</span>
    <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-outline font-label-mono-sm text-label-mono-sm font-semibold">64% AI Fit</span>
    </div>
    <span className="font-body-sm text-body-sm text-on-surface-variant">Backend Engineer • Evaluado hace 2 horas</span>
    </div>
    </div>
    <div className="flex items-center gap-space-xs self-start sm:self-auto">
    <span className="px-2.5 py-1 rounded-full bg-error-container/30 text-error font-label-mono-sm text-label-mono-sm font-semibold flex items-center gap-1">
    <span className="material-symbols-outlined text-[14px]">cancel</span>
                    Descartado
                  </span>
    </div>
    </div>
    {/* Waveform Snippet + Competencies */}
    <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col md:flex-row md:items-center justify-between gap-space-sm">
    <div className="flex items-center gap-space-sm flex-1 min-w-0">
    <button className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center text-on-surface hover:bg-primary hover:text-on-primary transition-transform active:scale-95 flex-shrink-0">
    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
    </button>
    {/* Mini Audio Waveform */}
    <div className="flex items-center gap-0.5 h-6 flex-1 max-w-xs overflow-hidden">
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-3 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-4 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-1 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-3 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-3 rounded-full"></span>
    <span className="w-1 bg-outline-variant h-2 rounded-full"></span>
    </div>
    <span className="font-label-mono-sm text-label-mono-sm text-outline whitespace-nowrap">02:11 min auditados</span>
    </div>
    {/* Competency Tags */}
    <div className="flex flex-wrap items-center gap-1.5">
    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">Alta vacilación oral</span>
    <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant font-label-mono-sm text-label-mono-sm">Brecha técnica en concurrencia</span>
    </div>
    </div>
    <div className="flex items-center justify-between text-body-sm text-body-sm pt-space-2xs">
    <p className="text-on-surface-variant italic truncate max-w-lg">“Dificultad para fundamentar respuestas de diseño de sistemas distribuidos.”</p>
    <button className="font-label-mono-sm text-label-mono-sm text-on-surface-variant hover:text-on-surface font-medium flex items-center gap-1 whitespace-nowrap">
    <span>Ver Informe</span>
    <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
    </button>
    </div>
    </div>
    </section>
    </div>
    {/* Right Column (approx 30% -> 4 of 12 cols) */}
    <div className="lg:col-span-4 flex flex-col gap-space-lg min-w-0">
    {/* Radar de Competencias Globales */}
    <section className="p-space-md rounded-xl bg-surface-container shadow-md flex flex-col gap-space-md">
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-space-xs">
    <span className="material-symbols-outlined text-tertiary text-[20px]">radar</span>
    <h3 className="font-headline-md text-headline-md text-on-surface">Radar de Competencias</h3>
    </div>
    <span className="font-label-mono-sm text-label-mono-sm text-tertiary">Promedio Red</span>
    </div>
    {/* Inline SVG Radar Chart */}
    <div className="relative flex items-center justify-center p-space-xs">
    <svg className="w-56 h-56" viewBox="0 0 240 240">
    {/* Concentric Grid Polygons */}
    <polygon className="text-surface-variant" fill="none" points="120,40 196,85 196,175 120,220 44,175 44,85" stroke="currentColor" strokeWidth="1"></polygon>
    <polygon className="text-surface-variant" fill="none" points="120,60 177,94 177,161 120,195 63,161 63,94" stroke="currentColor" strokeWidth="1"></polygon>
    <polygon className="text-surface-variant" fill="none" points="120,80 158,102 158,148 120,170 82,148 82,102" stroke="currentColor" strokeWidth="1"></polygon>
    {/* Axis lines */}
    <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 2" strokeWidth="1" x1="120" x2="120" y1="20" y2="220" />
    <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 2" strokeWidth="1" x1="44" x2="196" y1="85" y2="175" />
    <line className="text-surface-variant" stroke="currentColor" strokeDasharray="2 2" strokeWidth="1" x1="44" x2="196" y1="175" y2="85" />
    {/* Benchmark Overlay (Indigo Dashed) */}
    <polygon fill="none" points="120,48 180,90 170,165 120,200 60,165 55,90" stroke="#818CF8" strokeDasharray="4 3" strokeWidth="1.5"></polygon>
    {/* Candidate Global Match Polygon (Teal/Emerald Filled) */}
    <polygon fill="rgba(78, 222, 163, 0.22)" points="120,32 188,88 182,170 120,212 50,170 48,82" stroke="#4EDEA3" strokeWidth="2"></polygon>
    {/* Point dots */}
    <circle cx="120" cy="32" fill="#4EDEA3" r="3" />
    <circle cx="188" cy="88" fill="#4EDEA3" r="3" />
    <circle cx="182" cy="170" fill="#4EDEA3" r="3" />
    <circle cx="120" cy="212" fill="#4EDEA3" r="3" />
    <circle cx="50" cy="170" fill="#4EDEA3" r="3" />
    <circle cx="48" cy="82" fill="#4EDEA3" r="3" />
    </svg>
    </div>
    {/* Competency Metric Breakdown */}
    <div className="flex flex-col gap-space-xs">
    <div className="flex items-center justify-between font-body-sm text-body-sm">
    <span className="text-on-surface-variant">Pensamiento Crítico</span>
    <span className="font-label-mono-sm text-label-mono-sm font-semibold text-secondary">92%</span>
    </div>
    <div className="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
    <div className="h-full bg-secondary rounded-full" style={{width: '92%'}}></div>
    </div>
    <div className="flex items-center justify-between font-body-sm text-body-sm mt-1">
    <span className="text-on-surface-variant">Solución de Problemas</span>
    <span className="font-label-mono-sm text-label-mono-sm font-semibold text-tertiary">88%</span>
    </div>
    <div className="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
    <div className="h-full bg-tertiary rounded-full" style={{width: '88%'}}></div>
    </div>
    <div className="flex items-center justify-between font-body-sm text-body-sm mt-1">
    <span className="text-on-surface-variant">Agilidad de Aprendizaje</span>
    <span className="font-label-mono-sm text-label-mono-sm font-semibold text-secondary">94%</span>
    </div>
    <div className="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
    <div className="h-full bg-secondary rounded-full" style={{width: '94%'}}></div>
    </div>
    <div className="flex items-center justify-between font-body-sm text-body-sm mt-1">
    <span className="text-on-surface-variant">Comunicación Asertiva</span>
    <span className="font-label-mono-sm text-label-mono-sm font-semibold text-primary">85%</span>
    </div>
    <div className="w-full h-1 bg-surface-container-lowest rounded-full overflow-hidden">
    <div className="h-full bg-primary rounded-full" style={{width: '85%'}}></div>
    </div>
    </div>
    </section>
    {/* Agente de Voz EvalIA en Acción */}
    <section className="p-space-md rounded-xl bg-surface-container shadow-md flex flex-col gap-space-sm relative overflow-hidden">
    <div className="absolute -right-10 -bottom-10 w-32 h-32 bg-primary/10 rounded-full blur-xl pointer-events-none"></div>
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-space-xs">
    <span className="w-2.5 h-2.5 rounded-full bg-tertiary animate-ping"></span>
    <h3 className="font-headline-md text-headline-md text-on-surface">Agente de Voz en Acción</h3>
    </div>
    <span className="font-label-mono-sm text-label-mono-sm text-tertiary bg-tertiary-container/30 px-2 py-0.5 rounded">En vivo</span>
    </div>
    <div className="p-space-sm rounded-lg bg-surface-container-lowest flex flex-col gap-space-2xs">
    <div className="flex items-center justify-between">
    <span className="font-label-mono-sm text-label-mono-sm text-on-surface">Simulación ID #982</span>
    <span className="font-label-mono-sm text-label-mono-sm text-secondary">Acoustic Synth v4</span>
    </div>
    <p className="font-body-sm text-body-sm text-on-surface-variant">Entrevista oral interactiva con análisis acústico espectrográfico en milisegundos.</p>
    </div>
    {/* Tone Analysis Breakdown */}
    <div className="flex flex-col gap-space-xs pt-space-xs">
    <span className="font-label-mono-sm text-label-mono-sm uppercase text-outline">Análisis Tonal &amp; Emocional</span>
    <div className="flex items-center justify-between text-body-sm text-body-sm">
    <div className="flex items-center gap-1.5 text-on-surface-variant">
    <span className="material-symbols-outlined text-[16px] text-secondary">sentiment_satisfied</span>
    <span>Seguridad al hablar</span>
    </div>
    <span className="font-label-mono-sm text-label-mono-sm font-bold text-secondary">91%</span>
    </div>
    <div className="flex items-center justify-between text-body-sm text-body-sm">
    <div className="flex items-center gap-1.5 text-on-surface-variant">
    <span className="material-symbols-outlined text-[16px] text-tertiary">lightbulb</span>
    <span>Claridad conceptual</span>
    </div>
    <span className="font-label-mono-sm text-label-mono-sm font-bold text-tertiary">96%</span>
    </div>
    <div className="flex items-center justify-between text-body-sm text-body-sm">
    <div className="flex items-center gap-1.5 text-on-surface-variant">
    <span className="material-symbols-outlined text-[16px] text-primary">speed</span>
    <span>Estrés bajo control</span>
    </div>
    <span className="font-label-mono-sm text-label-mono-sm font-bold text-primary">89%</span>
    </div>
    </div>
    <button className="w-full mt-space-xs py-2 px-space-sm rounded-lg bg-surface-container-highest hover:bg-primary-container text-on-surface hover:text-on-primary-container font-body-sm text-body-sm font-semibold transition-all flex items-center justify-center gap-space-xs shadow-sm">
    <span className="material-symbols-outlined text-[18px]">mic_external_on</span>
    <span>Probar Agente en Vivo</span>
    </button>
    </section>
    {/* Alertas de Talento Excepcional (AI Insights) */}
    <section className="p-space-md rounded-xl bg-surface-container shadow-md flex flex-col gap-space-sm">
    <div className="flex items-center justify-between">
    <div className="flex items-center gap-space-xs">
    <span className="material-symbols-outlined text-secondary text-[20px]">auto_awesome</span>
    <h3 className="font-headline-md text-headline-md text-on-surface">Alertas de Talento Excepcional</h3>
    </div>
    <span className="px-2 py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-mono-sm text-label-mono-sm font-bold">2 Fast-Track</span>
    </div>
    <p className="font-body-sm text-body-sm text-on-surface-variant">Candidatos con scores que superan el percentil 95 global, listos para oferta directa.</p>
    <div className="flex flex-col gap-space-sm mt-space-2xs">
    {/* Standout 1 */}
    <div className="p-space-sm rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors flex items-center justify-between gap-space-xs">
    <div className="flex items-center gap-space-xs min-w-0">
    <img className="w-9 h-9 rounded-full object-cover flex-shrink-0" data-alt="Portrait of an exceptional software engineer candidate smiling during an oral evaluation, high tech aesthetic with clean background" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCKKnObN0rGtWIyXuHEUwwZuqqOd1QRAQQs187t3C-CF9pZX3tGNpIUzgL69v01PD3s-IF4YQA1xXIGaGUmSltb8K0pMOowXFDDHyxQitZ7ZE1g9bl_aED0BWCNVVeHrJ0NYhjzTACFBR0ii8hi4CXvlwXECRA4BOJfJS9W1Pqzc2kCMvhAGUsGEd3NgnTj_A1Q7rq2yi03hykByDx_PeWfaz7pg7dSUQtS_U8A4fV0EL090HN_rwF8" />
    <div className="flex flex-col min-w-0">
    <span className="font-headline-md text-body-md font-bold text-on-surface truncate">Lucía Domínguez</span>
    <span className="font-label-mono-sm text-label-mono-sm text-secondary truncate">98% Fit • Staff Architect</span>
    </div>
    </div>
    <button className="px-2 py-1 rounded bg-secondary text-on-secondary font-label-mono-sm text-label-mono-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
                  Ofertar
                </button>
    </div>
    {/* Standout 2 */}
    <div className="p-space-sm rounded-lg bg-surface-container-high hover:bg-surface-variant transition-colors flex items-center justify-between gap-space-xs">
    <div className="flex items-center gap-space-xs min-w-0">
    <img className="w-9 h-9 rounded-full object-cover flex-shrink-0" data-alt="Portrait of a male data analytics expert in front of subtle dual monitors, professional and polished lighting" src="https://lh3.googleusercontent.com/aida-public/AB6AXuD-qAJ_y-5Mn8Km7XcuEjiUEw15jjy33G7DXL3H9pCKmbTUOqScsMvEwgNmnUI8PpBMVMBVCjNxdMsqFuHJXQdAhUg-7rkGRKVOs1re4qY59dejWoz0R8IOTP6-raGQTcVjSQVO-3z19TZVbFJ8h9nbRNE3yDZ11St8veRaE9AptlkpDyjzu3RHzjcWE4A-72LufXfmrzBJojrzynZaw6vPKeLqQEtGFTErrGRbmUW3ZjqZbV8FrNFE" />
    <div className="flex flex-col min-w-0">
    <span className="font-headline-md text-body-md font-bold text-on-surface truncate">Mateo Navarro</span>
    <span className="font-label-mono-sm text-label-mono-sm text-tertiary truncate">95% Fit • ML Engineer</span>
    </div>
    </div>
    <button className="px-2 py-1 rounded bg-tertiary text-on-tertiary font-label-mono-sm text-label-mono-sm font-semibold hover:opacity-90 transition-opacity flex-shrink-0">
                  Ofertar
                </button>
    </div>
    </div>
    </section>
    </div>
    </div>
    </div>
  );
}
