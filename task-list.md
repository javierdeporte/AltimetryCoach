
# Task Checklist – MVP AltimetryCoach
> Actualiza los [ ] a [x] al completar. Añade subtareas según necesites.

## Sprint 0 · Configuración inicial
- [ ] 00-01 Elegir stack (Next.js + React 18 + TypeScript + Tailwind)
- [ ] 00-02 Configurar repo Lovable + GitHub sync
- [ ] 00-03 Añadir ESLint, Prettier, Husky, CI básico
- [ ] 00-04 Crear diseño UI base con Tailwind (landing, auth, dashboard shell)

## Sprint 1 · Base de datos & autenticación
- [ ] 01-01 Crear proyecto Supabase (URL, anon key)
- [ ] 01-02 Conectar Supabase en Lovable settings
- [ ] 01-03 Configurar email/password auth (sin verificación en dev)
- [ ] 01-04 Crear tablas: users, routes, segments, plans, subscriptions
- [ ] 01-05 Configurar políticas RLS (user_id = auth.uid())

## Sprint 2 · Importación y parseo de rutas
- [ ] 02-01 Crear componente drag-and-drop de archivos + URL
- [ ] 02-02 Implementar hook `useGPXParser` (togeojson, xml2js)
- [ ] 02-03 Guardar metadata ruta en `routes`
- [ ] 02-04 Mostrar mensaje de progreso y manejo de errores

## Sprint 3 · Visualización y segmentación
- [ ] 03-01 Integrar Mapbox GL JS (token en env)
- [ ] 03-02 Dibujar track sobre el mapa
- [ ] 03-03 Renderizar perfil de elevación con D3
- [ ] 03-04 Sincronizar hover mapa ↔ gráfico
- [ ] 03-05 Implementar `computeSegments(points, opts)`
- [ ] 03-06 Guardar segmentos en `segments`
- [ ] 03-07 Mostrar tabla de segmentos (dist, elev+, grade)

## Sprint 4 · Planificador de carrera
- [ ] 04-01 Crear modal "Plan de carrera"
- [ ] 04-02 Inputs: ritmo objetivo, peso atleta
- [ ] 04-03 Calcular tiempo por tramo, kcal, agua
- [ ] 04-04 Añadir exportación PDF/CSV (PDFKit, Papaparse)
- [ ] 04-05 Test unitario formula kcal/agua

## Sprint 5 · Gating Freemium / Pro
- [ ] 05-01 Crear productos y precios en Stripe (test mode)
- [ ] 05-02 Integrar Stripe Checkout y Portal cliente
- [ ] 05-03 Middleware server-side: limitar 3 rutas a usuarios Free
- [ ] 05-04 UI: badges "Pro" y upsell en dashboard

## Sprint 6 · Calidad & despliegue
- [ ] 06-01 Lighthouse audit ≥ 90 / 90 / 90
- [ ] 06-02 Pruebas end-to-end básicas (Playwright)
- [ ] 06-03 Configurar dominio *.lovable.app* y opcional custom
- [ ] 06-04 Publicar PWA; test offline básico

## Backlog futuro
- [ ] FIT/TCX + import Strava (Webhook)
- [ ] Comparador de rutas múltiple
- [ ] Perfil de atleta avanzado (VO₂ máx, FTP)
- [ ] Caché offline completo (Service Worker)
- [ ] Marketplace de planes de entrenamiento
