/**
 * @author Nicolas Espinosa Mooser & Santiago Moral Santorio
 */

let WALL = 0,
  LANDSCAPE = 3,
  performance = window.performance,
  minRowsCols = 5;

let isDragging = false;
let draggedCells = [];

// INIT
$(function () {
  let $grid = $("#search_grid"),
    $inputGridRows = $("#rows"),
    $inputGridCols = $("#cols");

  // Set max rows/cols
  $inputGridRows.attr("max", Math.floor($grid.width() / 24));
  $inputGridCols.attr("max", Math.floor($grid.height() / 24));

  let opts = {
    rows: 10,
    cols: 10,
    debug: false,
    diagonal: true,
  };

  let grid = new GraphSearch($grid, opts);

  $inputGridRows.change(function () {
    grid.setOption({
      rows: $(this).val() < minRowsCols ? minRowsCols : $(this).val(),
    });
  });

  $inputGridCols.change(function () {
    grid.setOption({
      cols: $(this).val() < minRowsCols ? minRowsCols : $(this).val(),
    });
  });

  $("#btnGenerate").click(function () {
    grid.setOption({
      rows: $inputGridRows.val() < minRowsCols ? minRowsCols : $(this).val(),
    });
    grid.setOption({
      cols: $inputGridCols.val() < minRowsCols ? minRowsCols : $(this).val(),
    });
    grid.initialize();
  });

  $("#startSimulationForm").on("submit", (e) => {
    e.preventDefault();

    grid.search();
  });
});

const css = {
  active: "active",
  start: "hiking",
  finish: "flag",
  water: "water",
  landscape: "landscape",
  waypoint: "camping",
};

/** 
 * @param $graph - Div de cells
 * @param options - Numero de filas, columnas y si permitir diagonales
*/
function GraphSearch($graph, options) {
  this.$graph = $graph;
  this.opts = options;
  this.initialize();
}

GraphSearch.prototype.setOption = function (opt) {
  this.opts = $.extend(this.opts, opt);
};

GraphSearch.prototype.initialize = function () {
  this.grid = [];
  let self = this,
    nodes = [],
    $graph = this.$graph;

  $graph.empty();

  let cellHeight = Math.max($graph.height() / this.opts.rows, 24),
    $cellTemplate = $("<span />")
      .addClass("grid_item col p-0")
      .height(cellHeight),
    startSet = false;

  for (let x = 0; x < this.opts.rows; x++) {
    let $row = $("<div class='row' />"),
      nodeRow = [],
      gridRow = [];

    for (let y = 0; y < this.opts.cols; y++) {
      let id = "cell_" + x + "_" + y,
        $cell = $cellTemplate.clone();
      $cell.attr("id", id).attr("x", x).attr("y", y);
      $row.append($cell);
      gridRow.push($cell);
      nodeRow.push(1);
    }
    $graph.append($row);

    this.grid.push(gridRow);
    nodes.push(nodeRow);
  }

  this.graph = new Graph(nodes);

  // bind cell event
  this.$cells = $graph.find(".grid_item");

  // Drag and drop detection
  this.$cells.on("mousedown", function (event) {
    let cursor = $("body").css("cursor");
    let cursorName = cursor.substring(
      cursor.lastIndexOf("/") + 1,
      cursor.lastIndexOf(".")
    );

    if (cursorName !== css.start && cursorName !== css.finish) {
      isDragging = true;
    }

    if (event.target.classList.contains("grid_item")) {
      draggedCells.push(event.target);
      self.cellClicked($(event.target));
    } else {
      const targetCell = event.target.closest(".grid_item");
      if (targetCell) {
        draggedCells.push(targetCell);
        self.cellClicked($(targetCell));
      }
    }
  });

  this.$cells.on("mousemove", function (event) {
    if (isDragging) {
      const hoveredCell = document.elementFromPoint(
        event.clientX,
        event.clientY
      );
      let cell;
      if (hoveredCell && hoveredCell.classList.contains("grid_item")) {
        cell = hoveredCell;
      } else if (hoveredCell) {
        cell = hoveredCell.closest(".grid_item");
      }
      if (cell && !draggedCells.includes(cell)) {
        draggedCells.push(cell);
        self.cellClicked($(cell));
      }
    }
  });

  this.$cells.on("mouseup", function (event) {
    isDragging = false;
    draggedCells = [];
    $("body").css("cursor", "default");
  });
};

GraphSearch.prototype.cellClicked = function ($cell) {
  let cursor = $("body").css("cursor");
  let cursorName = cursor.substring(
    cursor.lastIndexOf("/") + 1,
    cursor.lastIndexOf(".")
  );

  $cell.removeClass();
  $cell.html("");

  let $start = this.$cells.filter("." + css.start);
  let $end = this.$cells.filter("." + css.finish);
  if (cursorName === css.finish) {
    if ($end) {
      $end.html("");
      $end.removeClass();
      $end.addClass(`grid_item col p-0`);
    }
  } else if (cursorName === css.start) {
    if ($start) {
      $start.html("");
      $start.removeClass();
      $start.addClass(`grid_item col p-0`);
    }
  } else if (cursorName === css.water) {
    const x = parseInt($cell.attr("x"));
    const y = parseInt($cell.attr("y"));

    this.graph.grid[x][y].weight = WALL;
    this.graph.nodes[x * this.opts.cols + y].weight = WALL;
  } else if (cursorName === css.landscape) {
    const x = parseInt($cell.attr("x"));
    const y = parseInt($cell.attr("y"));

    this.graph.grid[x][y].weight = LANDSCAPE;
    this.graph.nodes[x * this.opts.cols + y].weight = LANDSCAPE;
  } else if (cursorName === css.waypoint) {
    //TODO HANDLE
    const x = parseInt($cell.attr("x"));
    const y = parseInt($cell.attr("y"));
  }

  $cell.addClass(`grid_item col p-0 ${cursorName}`);
  if (cursorName !== "") {
    $cell.html(getGoogleIcon(cursorName));
  } else {
    const x = parseInt($cell.attr("x"));
    const y = parseInt($cell.attr("y"));

    this.graph.grid[x][y].weight = 1;
    this.graph.nodes[x * this.opts.cols + y].weight = 1;
  }
};

GraphSearch.prototype.search = function () {
  var sTime = performance ? performance.now() : new Date().getTime();

  let $start = this.$cells.filter("." + css.start);
  start = this.nodeFromElement($start);

  let $end = this.$cells.filter("." + css.finish),
    end = this.nodeFromElement($end);

  let waypoints = this.$cells.filter("." + css.waypoint).toArray();
  waypoints.unshift(start);

  let waypointNodes = waypoints.map((waypoint) =>
    this.nodeFromElement($(waypoint))
  );

  let path = [];

  // Sort inicial
  waypointNodes = this.sortNodes(waypointNodes, start);
  while (waypointNodes.length !== 0) {
    let closestWaypoint = waypointNodes.shift();

    // Find path to closest
    let partialPath = astar.search(this.graph, start, closestWaypoint);
    if (partialPath.length > 0) {
      path = path.concat(partialPath);
      start = closestWaypoint;
    }

    // Sort remaining nodes from new start pos
    this.sortNodes(waypointNodes, start);
  }

  // Start or final waypoint to finish
  path = path.concat(astar.search(this.graph, start, end));

  let fTime = performance ? performance.now() : new Date().getTime(),
    duration = (fTime - sTime).toFixed(2);

  if (path.length === 0) {
    $("#message").text("couldn't find a path (" + duration + "ms)");
    this.animateNoPath();
  } else {
    $("#message").text("search took " + duration + "ms.");
    this.animatePath(path);
  }
};

GraphSearch.prototype.nodeFromElement = function ($cell) {
  return this.graph.grid[parseInt($cell.attr("x"))][parseInt($cell.attr("y"))];
};

GraphSearch.prototype.sortNodes = function (nodes, start) {
  nodes.sort((a, b) => {
    let startX = start.x;
    let startY = start.y;
    let aX = a.x;
    let aY = a.y;
    let bX = b.x;
    let bY = b.y;

    let distanceA = Math.sqrt(
      Math.pow(aX - startX, 2) + Math.pow(aY - startY, 2)
    );
    let distanceB = Math.sqrt(
      Math.pow(bX - startX, 2) + Math.pow(bY - startY, 2)
    );

    return distanceA - distanceB;
  });

  return nodes;
};

GraphSearch.prototype.animateNoPath = function () {
  let $graph = this.$graph;
  let jiggle = function (lim, i) {
    if (i >= lim) {
      $graph.css("top", 0).css("left", 0);
      return;
    }
    if (!i) i = 0;
    i++;
    $graph.css("top", Math.random() * 6).css("left", Math.random() * 6);
    setTimeout(function () {
      jiggle(lim, i);
    }, 5);
  };
  jiggle(15);
};

GraphSearch.prototype.animatePath = function (path) {
  let grid = this.grid,
    timeout = 1000 / grid.length,
    elementFromNode = function (node) {
      return grid[node.x][node.y];
    };

  let removeClass = function (path, i) {
    if (i >= path.length) {
      // finished removing path
      return;
    }
    elementFromNode(path[i]).removeClass(css.active);
    setTimeout(function () {
      removeClass(path, i + 1);
    }, timeout * path[i].getCost());
  };
  let addClass = function (path, i) {
    if (i >= path.length) {
      // Finished showing path, now remove
      return removeClass(path, 0);
    }
    elementFromNode(path[i]).addClass(css.active);
    setTimeout(function () {
      addClass(path, i + 1);
    }, timeout * path[i].getCost());
  };

  addClass(path, 0);
};

document.querySelectorAll("#icons .col").forEach((elem) => {
  elem.addEventListener("click", (e) => {
    document.getElementsByTagName(
      "body"
    )[0].style.cursor = `url('images/${e.target.innerHTML}.cur') 12 12, auto`;
  });
});

function getGoogleIcon(id) {
  return `<div class="row justify-content-center align-items-center h-100">
                <div class="col-auto p-0">
                    <span class="material-symbols-outlined">${id}</span>
                </div>
            </div>`;
}
