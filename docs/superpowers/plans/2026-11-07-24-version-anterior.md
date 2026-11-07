# Fase 12, primera parte: versión anterior (M-21)

M-33 (inglés) va en su propio PR: traducir todos los textos y sacar las etiquetas del catálogo es otro trabajo.

## Decisiones

- **Cuándo se copia.** La web guarda cada dos segundos: copiar en cada PUT dejaría «la versión de hace un momento». La API copia el diseño antes de cambiarlo solo si el último guardado tiene **30 minutos o más** (`VersionAnterior.PausaParaCopiar`: empieza otra sesión de edición) o si la web lo pide con **`X-Copia-Previa: 1`**, que manda al elegir «Sobrescribir con la mía» tras un conflicto (lo que pisa puede ser de hace un momento, de otro dispositivo). Así la copia es «el diseño antes de la última sesión» o «lo que había antes de sobrescribir».
- **Copia pedida protegida.** La copia de «Sobrescribir» (y lo que se deja al recuperar) es trabajo de alguien: lleva `pedida` y una copia automática no la sustituye en 7 días (`ProteccionDeLaPedida`); otra pedida sí. Lo propuso la revisión: con un solo hueco, la siguiente sesión normal la borraba sin aviso.
- **La marca de copia sobrevive a un fallo.** Si el PUT de «Sobrescribir» no sale (sin red, pestaña cerrada, sesión caducada), la copia local guarda `copiaPrevia` y al reabrir el primer guardado la vuelve a pedir.
- **Una por diseño** (`versiones_anteriores`, clave = id del diseño, cascada al borrar). La copia y el diseño se guardan en el mismo `SaveChanges`. Dos primeras copias simultáneas: la que pierde (23505 en `pk_versiones_anteriores`) cuenta como carrera perdida, igual que la versión.
- **Recuperar intercambia**: el diseño toma nombre, tipo y contenido de la copia (versión nueva) y lo que había pasa a ser la copia: recuperar se deshace recuperando otra vez. `POST /disenos/{id}/version-anterior/recuperar` con `If-Match` (412 si cambió, 428 sin él, 404 sin copia o ajeno).
- **Web**: «Recuperar la versión anterior» en Más acciones, solo en diseños de la cuenta y desactivada con cambios sin subir (se perderían). Pregunta con la fecha de la copia; al aceptar espera los guardados en marcha, recupera con la versión abierta y abre lo recuperado con `abrirDiseno`.
- Tamaño: la copia pesa como el diseño (hasta 1 MB): el máximo por usuario pasa de 100 MB a 200 MB.

## Verificación

- `dotnet test Decorazon.slnx`: 615 (Api 221, con `VersionAnteriorTests` y un reloj ajustable); `npx vitest run`: 1623; oxlint y `tsc -b` limpios.

## Revisión final

Revisor (agente, opus): sin críticos. Arreglados con test RED→GREEN: la copia pedida protegida 7 días (`VersionAnteriorProtegidaTests`), `copiaPrevia` en la copia local (`sincronizacion.test`), «Recuperar» comprueba otra vez los cambios sin subir tras esperar (`BarraSuperior.test`), y los textos explican cuándo se rehace la copia.

## Pendiente

- La copia no se puede ver antes de recuperarla (solo su fecha): recuperar y, si no era, recuperar otra vez.
- Sin e2e propio: lo cubren los tests de integración de la API y los de la barra.
- Una copia automática sigue rehaciéndose al volver a editar tras media hora: quien se arrepiente al día siguiente tiene que recuperar antes de tocar nada (lo dicen los textos). Dos huecos (sesión y pedida) lo resolverían del todo.
- Si la respuesta del PUT con copia se pierde y se vuelve a sobrescribir, la segunda copia guarda lo propio sobre lo ajeno (poco probable).
- El GET de la copia baja el contenido entero (hasta 1 MB) solo para enseñar la fecha.
- Si `validarDocumento` rechazara la copia recuperada (formato antiguo), el servidor ya ha intercambiado: se arregla recuperando otra vez.
