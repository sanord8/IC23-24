let WALL = 0,
  performance = window.performance;

// INIT
$(function () {
  let $grid = $("#search_grid"),
    $inputGridRows = $("#rows"),
    $inputGridCols = $("#cols");

  let opts = {
    rows: $inputGridRows.val(),
    cols: $inputGridCols.val(),
    debug: true,
    diagonal: true,
  };

  let grid = new GraphSearch($grid, opts, astar.search);

  $inputGridRows.change(function () {
    grid.setOption({ rows: $(this).val() });
  });

  $inputGridCols.change(function () {
    grid.setOption({ cols: $(this).val() });
  });

  $("#boardGenerationForm").on("submit", (e) => {
    e.preventDefault();
  });
  $("#btnGenerate").click(function () {
    grid.initialize();
  });
});

// TODO: Add css
const css = {
  start: "start",
  finish: "finish",
  active: "active",
  water: "water",
  landscape: "landscape",
};

function GraphSearch($graph, options, implementation) {
  this.$graph = $graph;
  this.search = implementation;
  this.opts = $.extend({ rows: 10, cols: 10 }, options);
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

  console.log(this.opts);

  let cellWidth = $graph.width() / this.opts.cols - 2, // -2 for borders
    cellHeight = $graph.height() / this.opts.rows - 2,
    $cellTemplate = $("<span />")
      .addClass("grid_item")
      .width(cellWidth)
      .height(cellHeight),
    startSet = false;

  for (let x = 0; x < this.opts.rows; x++) {
    let $row = $("<div class='clear' />"),
      nodeRow = [],
      gridRow = [];

    for (let y = 0; y < this.opts.cols; y++) {
      let id = "cell_" + x + "_" + y,
        $cell = $cellTemplate.clone();
      $cell.attr("id", id).attr("x", x).attr("y", y);
      $row.append($cell);
      gridRow.push($cell);

      // let isWall = Math.floor(Math.random() * (1 / self.opts.wallFrequency));
      // if (isWall === 0) {
      //     nodeRow.push(WALL);
      //     $cell.addClass(css.wall);
      // }
      // else {
      //     let cell_weight = ($("#generateWeights").prop("checked") ? (Math.floor(Math.random() * 3)) * 2 + 1 : 1);
      //     nodeRow.push(cell_weight);
      //     $cell.addClass('weight' + cell_weight);
      //     if ($("#displayWeights").prop("checked")) {
      //         $cell.html(cell_weight);
      //     }
      //     if (!startSet) {
      //         $cell.addClass(css.start);
      //         startSet = true;
      //     }
      // }
    }
    $graph.append($row);

    this.grid.push(gridRow);
    nodes.push(nodeRow);
  }

  this.graph = new Graph(nodes);

  // bind cell event
  this.$cells = $graph.find(".grid_item");
  this.$cells.click(function () {
    self.cellClicked($(this));
  });
};

GraphSearch.prototype.drawDebugInfo = function () {
  this.$cells.html(" ");
  let that = this;
  if (this.opts.debug) {
    that.$cells.each(function () {
      let node = that.nodeFromElement($(this)),
        debug = false;
      if (node.visited) {
        debug = "F: " + node.f + "<br />G: " + node.g + "<br />H: " + node.h;
      }

      if (debug) {
        $(this).html(debug);
      }
    });
  }
};

GraphSearch.prototype.cellClicked = function ($cell) {
  let cursor = $("body").css("cursor");
  let cursorName = cursor.substring(
    cursor.lastIndexOf("/") + 1,
    cursor.lastIndexOf(".")
  );

  if (cursor.includes(".cur")) {
    if (cursorName === "flag") {
      let $end = this.$cells.filter("." + css.finish);
      if ($end.hasClass(css.water) || $end.hasClass(css.start)) {
        return;
      }
      this.$cells.removeClass(css.finish);
      $cell.addClass(css.finish);
    } else if (cursorName === "hiking") {
      let $start = this.$cells.filter("." + css.start);
      if ($start.hasClass(css.water) || $start.hasClass(css.finish)) {
        return;
      }
      this.$cells.removeClass(css.start);
      $cell.addClass(css.start);
    } else if (cursorName === "water") {
      $cell.removeClass(css.landscape);
      $cell.addClass(css.water);
    } else if (cursorName === "landscape") {
      $cell.removeClass(css.water);
      $cell.addClass(css.landscape);
    }

    $cell.css("background-image", `url(./images/${cursorName}.cur)`);
    $("body").css("cursor", "default");
  } else {
    if (
      $cell.hasClass(css.water) ||
      $cell.hasClass(css.landscape) ||
      $cell.hasClass(css.hiking) ||
      $cell.hasClass(css.flag)
    ) {
      return;
    }

    let defaultCursorName = "arrow";
    let $existingCell = this.$cells.filter("." + defaultCursorName);
    if ($existingCell.length > 0) {
      $existingCell.removeClass(defaultCursorName);
    }
    $cell.addClass(defaultCursorName);
    $cell.css("background-image", "");
    $("body").css("cursor", "default");
  }
};
// let $prevFlagCell = this.$cells.filter("." + css.flag);
// if ($prevFlagCell.length > 0) {
//   $prevFlagCell.removeClass(css.flag);
// }

GraphSearch.prototype.nodeFromElement = function ($cell) {
  return this.graph.grid[parseInt($cell.attr("x"))][parseInt($cell.attr("y"))];
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

  let self = this;
  // will add start class if final
  let removeClass = function (path, i) {
    if (i >= path.length) {
      // finished removing path, set start positions
      return setStartClass(path, i);
    }
    elementFromNode(path[i]).removeClass(css.active);
    setTimeout(function () {
      removeClass(path, i + 1);
    }, timeout * path[i].getCost());
  };
  let setStartClass = function (path, i) {
    if (i === path.length) {
      self.$graph.find("." + css.start).removeClass(css.start);
      elementFromNode(path[i - 1]).addClass(css.start);
    }
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
  this.$graph.find("." + css.start).removeClass(css.start);
  this.$graph
    .find("." + css.finish)
    .removeClass(css.finish)
    .addClass(css.start);
};

document.querySelectorAll("#icons .col").forEach((elem) => {
  elem.addEventListener("click", (e) => {
    document.getElementsByTagName(
      "body"
    )[0].style.cursor = `url('images/${e.target.innerHTML}.cur'), auto`;
  });
});
