# Imán con columnas y vigas

## Para qué

Angel no podía encajar el PAX / GRIMO esquinero en un rincón con una columna de 20 × 20. El hueco del armario mide 12, así que la columna no cabe y el armario tiene que quedar a 8 cm de la pared izquierda, apoyado en la columna. El problema es que el imán no ve la estructura:

- si el armario se suelta cerca del rincón, se pega a la pared y la columna lo pisa;
- si se suelta más lejos, no se pega a nada y se queda donde cae (a 23 cm en su captura).

No había forma de dejarlo justo tocando la columna.

## Decisión de Angel

El imán tiene en cuenta las **columnas y las vigas**.

## Cómo funciona

Se usan los mismos volúmenes que los conflictos (`obstaculosDeEstancia`):
- una columna ocupa del suelo al techo;
- una viga va del techo hacia abajo lo que mide su canto.

Del mueble cuentan sus volúmenes reales: un esquinero es su L con el hueco, no su rectángulo exterior. Así, una viga solo afecta a los muebles que llegan a su altura.

Después de pegar el mueble a las paredes y a los demás muebles, como hasta ahora:

1. **Atraer.** Por cada eje que no haya quedado pegado a una pared, si un volumen del mueble queda a 15 cm o menos de una columna o viga con la que chocaría al moverse por ese eje, se acerca hasta tocarla. Pasa lo mismo que con los muebles.
2. **Apartar.** Si en la posición resultante el mueble choca con una columna o viga, se busca el desplazamiento más pequeño, por cualquiera de sus dos ejes, que lo deje tocándola sin chocar. Esto vale también para un eje ya pegado a una pared, porque así el armario se separa de la pared lo justo. Solo se aplica si el desplazamiento no pasa de 15 cm y el mueble no choca con otra columna o viga ni se sale de la estancia. Si no se encuentra, se queda donde estaba y sale el aviso de siempre.

Lo que mueve el imán se anota en `pegadoA` como `estructura:<id>`.

## Decisiones tras la revisión

- **Apartar no mete el mueble en otro:** se descarta cualquier desplazamiento que lo haga chocar con un mueble a su altura (los mismos que atrae el imán).
- **Pared despegada:** si al apartarlo por un eje se separa de la pared en la que estaba pegado, esa pared sale de `pegadoA`. Las cotas del arrastre dejan de marcarla como pegada.
- **Sin atracción** al editar medidas o giro de un mueble pegado a una pared: se pega solo a esas paredes, igual que con los muebles. Tampoco se atrae lo pisable.
- **Lo colgado no se aparta de la pared:** un cuadro o un módulo alto (altura desde el suelo > 0) solo se aparta a lo largo de su pared, nunca separándose de ella. Si no hay manera, se queda con su aviso.
- **«Dentro de la estancia»** usa la misma regla que el aviso de salirse (`penetracionEnParedes`).
- **Piezas giradas:** con una pieza girada respecto al mueble, como una viga en diagonal, el desplazamiento sale de las proyecciones y es una cota por arriba. En la práctica, solo se ajusta a lo que va alineado con el mueble.
- **Salto al arrastrar:** el mueble salta al cruzar el límite de 15 cm. Junto a un pilar, al pasar el umbral se aparta de golpe y sigue apartado mientras recorre el pilar. No vibra, porque cada fotograma parte del puntero.
- **Rendimiento:** la estructura se calcula aparte (`obstaculosDeEstructura`), sin puertas ni franjas protegidas, porque el imán corre en cada fotograma del arrastre.

## Ejemplo

- **El caso de Angel:** columna de 20 × 20 en el rincón y PAX de 111 × 111 con hueco 12 × 58. Al soltarlo cerca del rincón, queda pegado a la pared de atrás y a 8 cm de la izquierda, con el cuerpo del fondo tocando la columna. No hay avisos.
- **Soltado a 23 cm** de la pared: se acerca hasta tocar la columna y queda en el mismo sitio.
- **Hueco de 20 o más:** la columna cabe y el armario se queda pegado a las dos paredes.

## Fuera de alcance

- Radiadores: tienen su propio aviso, el de tapar el radiador.
- Que el imán use la forma real del mueble también con paredes y muebles: sigue usando el rectángulo exterior.

## Pruebas

En `nucleo/edicion/iman.test.ts`:
- **Columnas:**
  - el caso de Angel soltado cerca del rincón y soltado a 23 cm;
  - una columna que sí cabe en el hueco;
  - un armario normal contra una columna en medio de una pared, que se aparta hasta tocarla;
  - un solape de más de 15 cm, que no se mueve.
- **Vigas:**
  - un armario de 230 bajo una viga de canto 30 (fondo de la viga a 220), que se aparta;
  - uno de 201, que no se mueve.
- **Límites:** no se aparta hacia fuera de la estancia ni contra otra columna.
- **Resultado:** el documento queda sin conflictos.
