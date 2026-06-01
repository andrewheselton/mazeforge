Neutralino.init();

Neutralino.events.on("windowClose", () => {
  Neutralino.app.exit();
});

let svgText = "";

window.addEventListener("DOMContentLoaded", () => {
  document.getElementById("generateBtn").onclick = generate;
  document.getElementById("saveBtn").onclick = saveSvg;
  generate();
});

function generate() {
  const type = document.getElementById("mazeType").value;
  const cols = clampInt(value("cols"), 5, 80);
  const rows = clampInt(value("rows"), 5, 80);
  const widthMm = clampFloat(value("widthMm"), 50, 1000);
  const heightMm = clampFloat(value("heightMm"), 50, 1000);
  const strokeMm = clampFloat(value("strokeMm"), 0.01, 2);
  const marbleMm = clampFloat(value("marbleMm"), 2, 30);
  const clearanceMm = clampFloat(value("clearanceMm"), 0, 5);

  if (type === "square") {
    svgText = buildSquareLineMaze(cols, rows, widthMm, heightMm, strokeMm);
  } else if (type === "marble") {
    svgText = buildSquareMarbleMaze(cols, rows, widthMm, heightMm, strokeMm, marbleMm, clearanceMm);
  } else if (type === "circular") {
    svgText = buildCircularLabyrinth(cols, widthMm, heightMm, strokeMm);
  } else if (type === "circularMarble") {
    svgText = buildCircularMarbleMaze(cols, widthMm, heightMm, strokeMm, marbleMm, clearanceMm);
  }

  document.getElementById("mazeBox").innerHTML = svgText;
}

function value(id) {
  return document.getElementById(id).value;
}

function clampInt(v, min, max) {
  const n = parseInt(v, 10);
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function clampFloat(v, min, max) {
  const n = parseFloat(v);
  return Math.max(min, Math.min(max, Number.isFinite(n) ? n : min));
}

function round(n) {
  return Math.round(n * 1000) / 1000;
}

function createGrid(cols, rows) {
  const grid = [];

  for (let y = 0; y < rows; y++) {
    const row = [];

    for (let x = 0; x < cols; x++) {
      row.push({
        x,
        y,
        visited: false,
        walls: {
          top: true,
          right: true,
          bottom: true,
          left: true
        }
      });
    }

    grid.push(row);
  }

  return grid;
}

function carveMaze(grid, cols, rows) {
  const stack = [];
  const start = grid[0][0];

  start.visited = true;
  stack.push(start);

  while (stack.length > 0) {
    const current = stack[stack.length - 1];
    const neighbours = [];

    const x = current.x;
    const y = current.y;

    if (y > 0 && !grid[y - 1][x].visited) neighbours.push(grid[y - 1][x]);
    if (x < cols - 1 && !grid[y][x + 1].visited) neighbours.push(grid[y][x + 1]);
    if (y < rows - 1 && !grid[y + 1][x].visited) neighbours.push(grid[y + 1][x]);
    if (x > 0 && !grid[y][x - 1].visited) neighbours.push(grid[y][x - 1]);

    if (neighbours.length === 0) {
      stack.pop();
      continue;
    }

    const next = neighbours[Math.floor(Math.random() * neighbours.length)];

    removeWall(current, next);

    next.visited = true;
    stack.push(next);
  }

  grid[0][0].walls.left = false;
  grid[rows - 1][cols - 1].walls.right = false;
}

function removeWall(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;

  if (dx === 1) {
    a.walls.right = false;
    b.walls.left = false;
  } else if (dx === -1) {
    a.walls.left = false;
    b.walls.right = false;
  } else if (dy === 1) {
    a.walls.bottom = false;
    b.walls.top = false;
  } else if (dy === -1) {
    a.walls.top = false;
    b.walls.bottom = false;
  }
}

function buildSquareLineMaze(cols, rows, widthMm, heightMm, strokeMm) {
  const grid = createGrid(cols, rows);
  carveMaze(grid, cols, rows);

  const cellW = widthMm / cols;
  const cellH = heightMm / rows;
  const lines = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];

      const x1 = x * cellW;
      const y1 = y * cellH;
      const x2 = x1 + cellW;
      const y2 = y1 + cellH;

      if (cell.walls.top) lines.push(line(x1, y1, x2, y1));
      if (cell.walls.right) lines.push(line(x2, y1, x2, y2));
      if (cell.walls.bottom) lines.push(line(x1, y2, x2, y2));
      if (cell.walls.left) lines.push(line(x1, y1, x1, y2));
    }
  }

  return wrapSvg(widthMm, heightMm, strokeMm, lines.join("\n"));
}

function buildSquareMarbleMaze(cols, rows, widthMm, heightMm, strokeMm, marbleMm, clearanceMm) {
  const grid = createGrid(cols, rows);
  carveMaze(grid, cols, rows);

  const cellW = widthMm / cols;
  const cellH = heightMm / rows;

  const channelW = marbleMm + clearanceMm;
  const half = Math.min(channelW / 2, cellW * 0.42, cellH * 0.42);

  const shapes = [];

  shapes.push(rect(0, 0, widthMm, heightMm));

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const cell = grid[y][x];

      const cx = x * cellW + cellW / 2;
      const cy = y * cellH + cellH / 2;

      shapes.push(circle(cx, cy, half));

      if (!cell.walls.right) {
        shapes.push(line(cx, cy - half, cx + cellW, cy - half));
        shapes.push(line(cx, cy + half, cx + cellW, cy + half));
      }

      if (!cell.walls.bottom) {
        shapes.push(line(cx - half, cy, cx - half, cy + cellH));
        shapes.push(line(cx + half, cy, cx + half, cy + cellH));
      }
    }
  }

  shapes.push(circle(cellW / 2, cellH / 2, half * 1.2));
  shapes.push(circle(widthMm - cellW / 2, heightMm - cellH / 2, half * 1.2));

  return wrapSvg(widthMm, heightMm, strokeMm, shapes.join("\n"));
}

function buildCircularLabyrinth(rings, widthMm, heightMm, strokeMm) {
  const cx = widthMm / 2;
  const cy = heightMm / 2;
  const maxR = Math.min(widthMm, heightMm) * 0.46;

  const shapes = [];

  for (let i = 1; i <= rings; i++) {
    const r = (maxR / rings) * i;
    const start = (i * 73) % 360;
    const end = start + 330;

    shapes.push(arc(cx, cy, r, start, end));
  }

  shapes.push(circle(cx, cy, (maxR / rings) * 0.35));

  return wrapSvg(widthMm, heightMm, strokeMm, shapes.join("\n"));
}

function buildCircularMarbleMaze(rings, widthMm, heightMm, strokeMm, marbleMm, clearanceMm) {
  const cx = widthMm / 2;
  const cy = heightMm / 2;

  const maxR = Math.min(widthMm, heightMm) * 0.46;
  const pathW = marbleMm + clearanceMm;

  const shapes = [];

  shapes.push(circle(cx, cy, maxR));

  for (let i = 1; i <= rings; i++) {
    const r = (maxR / rings) * i;

    const inner = Math.max(1, r - pathW / 2);
    const outer = r + pathW / 2;

    const start = (i * 67) % 360;
    const end = start + 326;

    shapes.push(arc(cx, cy, inner, start, end));
    shapes.push(arc(cx, cy, outer, start, end));
  }

  shapes.push(circle(cx, cy, pathW * 0.7));
  shapes.push(circle(cx + maxR - pathW, cy, pathW * 0.65));

  return wrapSvg(widthMm, heightMm, strokeMm, shapes.join("\n"));
}

function line(x1, y1, x2, y2) {
  return `<line x1="${round(x1)}" y1="${round(y1)}" x2="${round(x2)}" y2="${round(y2)}" />`;
}

function rect(x, y, w, h) {
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" />`;
}

function circle(cx, cy, r) {
  return `<circle cx="${round(cx)}" cy="${round(cy)}" r="${round(r)}" />`;
}

function arc(cx, cy, r, startDeg, endDeg) {
  const start = polar(cx, cy, r, startDeg);
  const end = polar(cx, cy, r, endDeg);
  const largeArc = endDeg - startDeg <= 180 ? 0 : 1;

  return `<path d="M ${start.x} ${start.y} A ${round(r)} ${round(r)} 0 ${largeArc} 1 ${end.x} ${end.y}" />`;
}

function polar(cx, cy, r, deg) {
  const a = Math.PI / 180 * deg;

  return {
    x: round(cx + Math.cos(a) * r),
    y: round(cy + Math.sin(a) * r)
  };
}

function wrapSvg(widthMm, heightMm, strokeMm, content) {
  return `
<svg xmlns="http://www.w3.org/2000/svg"
     width="${widthMm}mm"
     height="${heightMm}mm"
     viewBox="0 0 ${widthMm} ${heightMm}">
  <g fill="none"
     stroke="black"
     stroke-width="${strokeMm}"
     stroke-linecap="round"
     stroke-linejoin="round">
${content}
  </g>
</svg>`.trim();
}

async function saveSvg() {
  if (!svgText || svgText.trim() === "") {
    generate();
  }

  try {
    let filename = await Neutralino.os.showSaveDialog("Save Maze SVG", {
      defaultPath: "mazeforge.svg",
      filters: [
        { name: "SVG files", extensions: ["svg"] },
        { name: "All files", extensions: ["*"] }
      ]
    });

    if (!filename) {
      return;
    }

    if (!filename.toLowerCase().endsWith(".svg")) {
      filename += ".svg";
    }

    await Neutralino.filesystem.writeFile(filename, svgText);

    await Neutralino.os.showMessageBox(
      "MazeForge",
      "SVG saved successfully",
      "OK",
      "INFO"
    );
  } catch (err) {
    console.error(err);
    alert("Save failed. Check neutralino.config.json has enableNativeAPI true and nativeAllowList includes os.* and filesystem.*");
  }
}