const table = document.querySelector("table");

table.onmousemove = function(event) {
    const target = event.target;

    if (target.tagName != "TD") return;

    const row = target.parentNode.rowIndex;
    const col = target.cellIndex;

    // Remove the class 'active' from all cells
    document.querySelectorAll(".active").forEach(x => x.classList.remove("active"));

    // Add the class 'active' to the current row
    for (let i = 0; i < table.rows.length; i++) {
        table.rows[i].cells[col].classList.add("active");
    }

    // Add the class 'active' to the current column
    for (let i = 0; i < table.rows[row].cells.length; i++) {
        table.rows[row].cells[i].classList.add("active");
    }
};

table.onmouseenter = function() {
    table.classList.add("hover");
};

table.onmouseleave = function() {
    table.classList.remove("hover");
};