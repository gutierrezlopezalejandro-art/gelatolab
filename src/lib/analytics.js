/**
 * Capa de analitica — actualmente DESACTIVADA.
 *
 * Hasta la 1.1.0 esto envolvia a Plausible y se gateaba con el consentimiento
 * del CookieBanner. Al pasar a app nativa sin cuentas se elimino:
 *
 *   - El CookieBanner no aplica: una app nativa no usa cookies de terceros.
 *   - Cualquier llamada a un servidor de analitica obliga a declarar
 *     recoleccion de datos en la ficha de App Store y Play, y el objetivo
 *     declarado del producto es poder decir "no se recopilan datos".
 *   - Las consolas de ambas tiendas ya entregan instalaciones, retencion y
 *     fallos sin instrumentar nada.
 *
 * Se conservan `track` y `trackPageview` como no-op para no tener que tocar
 * los ~30 puntos de llamada repartidos en la app. Si mas adelante se decide
 * instrumentar algo, este es el unico archivo que cambia.
 *
 * PENDIENTE DE DECISION: si la analitica no vuelve, conviene limpiar los
 * puntos de llamada en una pasada aparte.
 */

/** No-op. Antes enviaba un evento a Plausible. */
export function track(_eventName, _props = undefined) {
  /* intencionalmente vacio */
}

/** No-op. Antes registraba una vista de pagina virtual. */
export function trackPageview() {
  /* intencionalmente vacio */
}
