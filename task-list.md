

# Task Checklist – MVP AltimetryCoach
> Actualiza los [ ] a [x] al completar. Añade subtareas según necesites.

## Sprint 0 · Configuración inicial
- [x] 00-01 Elegir stack (Next.js + React 18 + TypeScript + Tailwind)
- [x] 00-02 Configurar repo Lovable + GitHub sync
- [x] 00-03 Añadir ESLint, Prettier, Husky, CI básico
- [x] 00-04 Crear diseño UI base con Tailwind (landing, auth, dashboard shell)

## Sprint 1 · Base de datos & autenticación
- [x] 01-01 Crear proyecto Supabase (URL, anon key)
- [x] 01-02 Conectar Supabase en Lovable settings
- [x] 01-03 Configurar email/password auth (sin verificación en dev)
- [x] 01-04 Crear tablas: users, routes, segments, plans, subscriptions
- [x] 01-05 Configurar políticas RLS (user_id = auth.uid())

## Sprint 2 · Importación y parseo de rutas
- [x] 02-01 Crear componente drag-and-drop de archivos + URL
- [x] 02-02 Implementar hook `useGPXParser` (togeojson, xml2js)
- [x] 02-03 Guardar metadata ruta en `routes`
- [x] 02-04 Mostrar mensaje de progreso y manejo de errores

## Sprint 3 · Visualización y segmentación
- [x] 03-01 Integrar Mapbox GL JS (token en env)
- [x] 03-02 Dibujar track sobre el mapa
- [x] 03-03 Renderizar perfil de elevación con D3
- [x] 03-04 Sincronizar hover mapa ↔ gráfico
- [x] 03-05 Implementar `computeSegments(points, opts)`
- [x] 03-06 Guardar segmentos en `segments`
- [x] 03-07 Mostrar tabla de segmentos (dist, elev+, grade)

## Sprint 3.5 · Mejoras UX y navegación (NUEVAS)
- [x] 03-08 Reorganizar estructura de navegación del dashboard
- [x] 03-09 Crear página dedicada "Mis Rutas" (/dashboard/routes)
- [x] 03-10 Mejorar componente RoutesList con filtros por tipo de ruta
- [x] 03-11 Implementar navegación correcta entre páginas
- [x] 03-12 Añadir estadísticas extendidas en RouteDetail (max/min elevation, grades)
- [x] 03-13 Mejorar diseño visual de tarjetas de rutas con badges de tipo y dificultad

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
- [ ] Modo oscuro completo para todos los componentes
- [ ] Búsqueda y filtros avanzados en lista de rutas
- [ ] Marcadores personalizados en rutas
- [ ] Exportación de datos de rutas en múltiples formatos

## Estado actual del MVP
**Completado:** Sprint 0, 1, 2, 3 y mejoras UX (3.5) ✅
**En progreso:** Sprint 4 (Planificador de carrera) 🔄
**Pendiente:** Sprint 5 (Monetización) y 6 (Despliegue) ⏳

### Funcionalidades core implementadas:
- ✅ Autenticación completa con Supabase
- ✅ Importación y parseo de archivos GPX
- ✅ Visualización interactiva: mapa + perfil de elevación
- ✅ Segmentación automática de rutas
- ✅ Gestión completa de rutas con metadatos
- ✅ Dashboard organizado con navegación clara
- ✅ Filtros y categorización de rutas
- ✅ Estadísticas detalladas por ruta

### Próximos hitos críticos:
1. **Planificador de carrera** (core MVP feature)
2. **Límites freemium** (monetización)
3. **Optimización y PWA** (calidad)

