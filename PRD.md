
---
title: AltimetryCoach – Documento de Requerimientos de Producto (PRD)
version: 1.1
last_updated: 2025-06-14
owner: Product Owner / UX Lead
---

## 1 · Propósito
Crear una **aplicación PWA mobile-first** que permita a deportistas de montaña **analizar rutas** (GPX/FIT/TCX) y **planificar su estrategia** de ritmo, nutrición e hidratación.  
Se lanzará como **SaaS Freemium** con un plan "Pro Athlete" de pago.

## 2 · Declaración del problema
Las herramientas actuales no combinan en un solo flujo el análisis de elevación, la previsión de ritmos y la planificación nutricional, generando trabajo manual y errores en terrenos montañosos.

## 3 · Visión
> "Ser la referencia para deportes de desnivel: subir un archivo y, en segundos, obtener una lectura clara de la ruta y un plan personalizado, incluso sin conexión."

## 4 · Objetivos y métricas

| Objetivo | KPI | Meta |
|----------|-----|------|
| Adquisición | Usuarios registrados | 25 000 |
| Retención | Activos a 30 días | ≥ 40 % |
| Monetización | Conversión a Pro | ≥ 5 % |
| Rendimiento | Render GPX ≤ 50 km | ≤ 2 s (p95) |
| Disponibilidad | SLA | 99 % |

## 5 · Personas clave
* **P1 – Principiante**: busca simplicidad y plan gratuito.  
* **P2 – Amateur competitivo**: necesita splits y recordatorios nutricionales.  
* **P3 – Entrenador/elite**: requiere cargas masivas y exportaciones.

## 6 · Alcance

### 6.1 MVP
* Importar GPX
* Mapa + perfil de elevación interactivos
* Segmentación automática parametrizable
* Tabla de métricas por segmento
* Planificador básico de carrera (tiempos, kcal, agua)
* Límite Freemium: 3 rutas almacenadas

### 6.2 Iteraciones futuras
* FIT/TCX + Sync Strava  
* Perfil avanzado de atleta  
* Comparación múltiple de rutas  
* Modo offline (PWA)  
* Marketplace de planes  

## 7 · Requerimientos funcionales

| Código | Descripción | Prioridad |
|--------|-------------|-----------|
| F-01 | Importar GPX (archivo/URL) | Must |
| F-02 | Renderizar mapa + perfil | Must |
| F-03 | Segmentación automática | Must |
| F-04 | Métricas por segmento | Must |
| F-05 | Planificador de carrera | Must |
| F-06 | Marcadores personalizados | Must |
| F-07 | FIT/TCX + Strava OAuth | Should |
| F-08 | Comparador de rutas | Should |
| F-09 | Perfil de atleta | Should |
| F-10 | Modo offline | Could |

## 8 · Requerimientos no funcionales

| Código | Categoría | Especificación |
|--------|-----------|----------------|
| NF-01 | Rendimiento | ≤ 2 s ruta ≤ 50 km |
| NF-02 | Seguridad | HTTPS, JWT, AES-256 at rest |
| NF-03 | Disponibilidad | 99 % uptime |
| NF-04 | Escalabilidad | K8s HPA; 10 000 CCU |
| NF-05 | Accesibilidad | WCAG AA |

## 9 · Modelo de negocio
* **Gratis:** 3 rutas, métricas básicas.  
* **Pro Athlete (US$ 9/mes):** rutas ilimitadas, exportación, offline, planner avanzado.  
Pagos recurrentes con Stripe; límites aplicados en backend.

## 10 · Analítica
Amplitude para uso y conversión; Web Vitals + Sentry para rendimiento; cohortes de retención.

## 11 · Preguntas abiertas
1. Precisión de fórmulas kcal/agua.  
2. Costes Mapbox en escala.  
3. Cumplimiento GDPR/PHIPA.

## 12 · Riesgos & mitigaciones

| Riesgo | Impacto | Prob. | Mitigación |
|--------|---------|-------|------------|
| Aumento precios Mapbox | Alto | Medio | Evaluar tileserver OSS |
| GPX edge cases | Medio | Alto | Dataset extenso + fallback |
| Onboarding Stripe LATAM | Medio | Bajo | Iniciar trámites temprano |

*Fin del documento*
