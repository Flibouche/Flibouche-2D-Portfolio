import { dialogueData, scaleFactor } from "./constants";
import { k } from "./kaboomCtx";
import { displayDialogue, setCamScale } from "./utils";

// Chargement de la feuille de sprites avec Kaboom.js
k.loadSprite("spritesheet", "./spritesheet.png", {
  // Définir le nombre de sections (slices) sur l'axe X et Y dans la feuille de sprites
  sliceX: 39,
  sliceY: 31,
  // Définition des animations et images statiques (idle)
  anims: {
    "idle-down": 936,
    "walk-down": { from: 936, to: 939, loop: true, speed: 8 },
    "idle-side": 975,
    "walk-side": { from: 975, to: 978, loop: true, speed: 8 },
    "idle-up": 1014,
    "walk-up": { from: 1014, to: 1017, loop: true, speed: 8 },
  },
});

// Chargement de la map
k.loadSprite("map", "./map.png");

// Ajout d'un background
k.setBackground(k.Color.fromHex("#311047"));

// Définition de la scène principale du projet
k.scene("main", async () => {
  // Chargement des données de la carte depuis un fichier JSON
  const mapData = await (await fetch("./map.json")).json();
  const layers = mapData.layers; // Extraction des différents layers de la map

  // Ajout de la map en tant que sprite à la scène, on ajoute le sprite "map", on le positionne à l'axe 0,0 et on applique un facteur de mise à l'échelle
  const map = k.add([k.sprite("map"), k.pos(0), k.scale(scaleFactor)]);

  // Création du player avec ses composants et propriétés
  const player = k.make([
    k.sprite("spritesheet", { anim: "idle-down" }), // Par défaut on utilise l'animation de idle-down
    k.area({
      shape: new k.Rect(k.vec2(0, 3), 10, 10), // On défini un zone de collision rectangulaire de 10x10 à partir du point (0, 3)
    }),
    k.body(), // On ajoute de la physique au player
    k.anchor("center"),
    k.pos(),
    k.scale(scaleFactor),
    {
      // Quand le player est dans une boite de dialogue, il ne peut pas bouger
      speed: 250,
      direction: "down",
      isInDialogue: false,
    },
    "player",
  ]);

  // On parcours toutes les couches de la map
  for (const layer of layers) {
    // On vérifie si le layer est nommé "boudaries"
    if (layer.name === "boundaries") {
      // On parcours tous les objets du layer "boundaries"
      for (const boundary of layer.objects) {
        // On ajoute une zone de collision pour chaque objet du layer "boundary"
        map.add([
          k.area({
            shape: new k.Rect(k.vec2(0), boundary.width, boundary.height), // On défini la zone de collision avec la largeur/hauteur de l'objet (soit la valeur dans le logiciel Tiled)
          }),
          k.body({ isStatic: true }), // On le rend statique
          k.pos(boundary.x, boundary.y), // On le positionne sur la map
          boundary.name, // On utilise le nom de l'objet comme étiquette
        ]);

        // On vérifie si l'objeta un nom
        if (boundary.name) {
          // On ajoute une fonction de collision pour le joueur
          player.onCollide(boundary.name, () => {
            player.isInDialogue = true; // Dès que le player touche la zone de collision de l'objet, on met le joueur en état de dialogue
            displayDialogue(dialogueData[boundary.name], () => (player.isInDialogue = false)); // On affiche un dialogue et on désactive l'état du dialogue une fois terminé
            stopAnims();
          });
        }
      }
      continue; // On passe au prochain layer
    }

    // On vérifie si le layer est nommé "spawnpoints"
    if (layer.name === "spawnpoints") {
      // On parcours tous les objets du layer "spawnpoints"
      for (const entity of layer.objects) {
        // On vérifie si l'objet est le point de spawn du player
        if (entity.name === "player") {
          // On défini la position du player sur la map en fonction de l'objet
          player.pos = k.vec2(
            // Calcul de la position en X et Y avec le facteur de mise à l'échelle
            (map.pos.x + entity.x) * scaleFactor,
            (map.pos.y + entity.y) * scaleFactor
          );
          // On ajoute le player à la scène
          k.add(player);
          continue;
        }
      }
    }
  }

  setCamScale(k);

  k.onResize(() => {
      setCamScale(k);
  });

  k.onUpdate(() => {
    k.camPos(player.worldPos().x, player.worldPos().y - 100);
  });

  k.onMouseDown((mouseBtn) => {
    if (mouseBtn !== "left" || player.isInDialogue) return;

    const worldMousePos = k.toWorld(k.mousePos());
    player.moveTo(worldMousePos, player.speed);

    const mouseAngle = player.pos.angle(worldMousePos);

    const lowerBound = 50;
    const upperBound = 125;

    if (
      mouseAngle > lowerBound &&
      mouseAngle < upperBound &&
      player.curAnim() !== "walk-up"
    ) {
      player.play("walk-up");
      player.direction = "up";
      return;
    }

    if (
      mouseAngle < -lowerBound &&
      mouseAngle > -upperBound &&
      player.curAnim() !== "walk-down"
    ) {
      player.play("walk-down");
      player.direction = "down";
      return;
    }

    if (Math.abs(mouseAngle) > upperBound) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      return;
    }

    if (Math.abs(mouseAngle) < lowerBound) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      return;
    }
  });

  function stopAnims() {
    if (player.direction === "down") {
      player.play("idle-down");
      return;
    }
    if (player.direction === "up") {
      player.play("idle-up");
      return;
    }

    player.play("idle-side");
  }

  k.onMouseRelease(stopAnims);

  k.onKeyRelease(() => {
    stopAnims();
  });
  k.onKeyDown((key) => {
    const keyMap = [
      k.isKeyDown("right"),
      k.isKeyDown("left"),
      k.isKeyDown("up"),
      k.isKeyDown("down"),
    ];

    let nbOfKeyPressed = 0;
    for (const key of keyMap) {
      if (key) {
        nbOfKeyPressed++;
      }
    }

    if (nbOfKeyPressed > 1) return;

    if (player.isInDialogue) return;
    if (keyMap[0]) {
      player.flipX = false;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "right";
      player.move(player.speed, 0);
      return;
    }

    if (keyMap[1]) {
      player.flipX = true;
      if (player.curAnim() !== "walk-side") player.play("walk-side");
      player.direction = "left";
      player.move(-player.speed, 0);
      return;
    }

    if (keyMap[2]) {
      if (player.curAnim() !== "walk-up") player.play("walk-up");
      player.direction = "up";
      player.move(0, -player.speed);
      return;
    }

    if (keyMap[3]) {
      if (player.curAnim() !== "walk-down") player.play("walk-down");
      player.direction = "down";
      player.move(0, player.speed);
    }
  });
});

k.go("main");
