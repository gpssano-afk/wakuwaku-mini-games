(() => {
  "use strict";
  const NS = "http://www.w3.org/2000/svg", H = Math.sqrt(3) * 10;
  const key = cell => `${cell.x},${cell.y},${cell.z}`;
  // Equal-length edges, camera looking along (1,1,1); +x, +y, +z face it.
  const project = ({x,y,z}) => ({x:30*(x-y), y:H*(x+y-2*z)});
  const corners = {
    x:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]],
    y:[[0,1,0],[0,1,1],[1,1,1],[1,1,0]],
    z:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]]
  };
  function faces(cells) {
    const occupied = new Set(cells.map(key)), result = [];
    // A cell can occlude another only if it is closer along all three axes.
    // Draw back to front; omit shared/internal faces entirely.
    const sorted = [...cells].sort((a,b) => a.x+a.y+a.z-b.x-b.y-b.z || a.z-b.z || a.y-b.y || a.x-b.x);
    for (const cell of sorted) for (const axis of ["x","y","z"]) {
      if (occupied.has(key({...cell,[axis]:cell[axis]+1}))) continue;
      result.push({cell,axis,vertices:corners[axis].map(([x,y,z]) => ({x:cell.x+x,y:cell.y+y,z:cell.z+z}))});
    }
    return result;
  }
  // All exposed quads lie on one triangular lattice. Overwrite identical
  // triangles in painter order: an exact visibility map, not a bounding-box test.
  function visibleTriangles(cells) {
    const visible = new Map();
    for (const face of faces(cells)) for (const indices of [[0,1,2],[0,2,3]]) {
      const vertices = indices.map(i => face.vertices[i]);
      const lattice = vertices.map(p => [p.x-p.y,p.x+p.y-2*p.z]);
      const id = lattice.map(p => p.join(",")).sort().join(";");
      visible.set(id,{...face,vertices,lattice});
    }
    return visible;
  }
  function allVisible(cells) {
    const owners = new Set([...visibleTriangles(cells).values()].map(face => key(face.cell)));
    return cells.every(cell => owners.has(key(cell)));
  }
  function fingerprint(cells) {
    const triangles = [...visibleTriangles(cells).values()];
    const minU = Math.min(...triangles.flatMap(t => t.lattice.map(p => p[0])));
    const minV = Math.min(...triangles.flatMap(t => t.lattice.map(p => p[1])));
    return new Map(triangles.map(t => [t.lattice.map(([u,v]) => `${u-minU},${v-minV}`).sort().join(";"),t.axis]));
  }
  function difference(a,b) {
    const left=fingerprint(a),right=fingerprint(b),union=new Set([...left.keys(),...right.keys()]);
    let different=0;
    for(const id of union) if(left.get(id)!==right.get(id)) different++;
    return different/union.size;
  }
  function bounds(cells) {
    const points=faces(cells).flatMap(face=>face.vertices.map(project));
    return {left:Math.min(...points.map(p=>p.x)),right:Math.max(...points.map(p=>p.x)),top:Math.min(...points.map(p=>p.y)),bottom:Math.max(...points.map(p=>p.y))};
  }
  function viewBox(cells,padding=10) {
    const b=bounds(cells);return `${b.left-padding} ${b.top-padding} ${b.right-b.left+padding*2} ${b.bottom-b.top+padding*2}`;
  }
  const warm={z:"#ffe19a",x:"#d98b35",y:"#f6b74f"};
  const blue={z:"#c3ebf5",x:"#569cbc",y:"#8acade"};
  const cavity={z:"#ecc174",x:"#b7752e",y:"#d79b44"};
  function group(cells,{size=0,highlight=new Set(),piece=false}={}) {
    const g=document.createElementNS(NS,"g");
    for(const face of faces(cells)) {
      const polygon=document.createElementNS(NS,"polygon");
      const inner=size>0&&face.cell[face.axis]+1<size;
      const cool=piece||highlight.has(key(face.cell));
      polygon.setAttribute("points",face.vertices.map(project).map(p=>`${p.x},${p.y}`).join(" "));
      polygon.setAttribute("fill",(cool?blue:inner?cavity:warm)[face.axis]);
      polygon.setAttribute("stroke",cool?"#3b6c84":"#8c5927");
      polygon.setAttribute("stroke-width","1.2");polygon.setAttribute("stroke-linejoin","round");
      polygon.dataset.cell=key(face.cell);polygon.dataset.face=face.axis;polygon.dataset.cavity=String(inner);
      g.append(polygon);
    }
    return g;
  }
  function draw(svg,cells,options={}) {svg.replaceChildren(group(cells,options));svg.dataset.voxels=String(cells.length);svg.dataset.occupied=cells.map(key).sort().join(";");}
  window.CubeRenderer=Object.freeze({project,faces,visibleTriangles,allVisible,fingerprint,difference,bounds,viewBox,group,draw,key});
})();
