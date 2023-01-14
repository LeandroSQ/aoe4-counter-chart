const table = document.querySelector("table");

let selectedRow = -1;
let selectedCol = -1;

function removeActive() {
    selectedCol = -1;
    selectedRow = -1;

    for (let row = 0; row < table.rows.length; row++) {
        for (let col = 0; col < table.rows[row].cells.length; col++) {
            table.rows[row].cells[col].classList.remove("active");
        }
    }
}

function loop() {
    for (let row = 0; row < table.rows.length; row++) {
		for (let col = 0; col < table.rows[row].cells.length; col++) {
			if (row === selectedRow || col === selectedCol) {
				table.rows[row].cells[col].classList.add("active");
			} else {
				table.rows[row].cells[col].classList.remove("active");
			}
		}
	}

    requestAnimationFrame(loop);
}

table.onmousemove = function(event) {
    const target = event.target;

    if (target.tagName != "TD") return;

    selectedRow = target.parentNode.rowIndex;
    selectedCol = target.cellIndex;
};

table.onmouseenter = function() {
    removeActive();
    table.classList.add("hover");
};

table.onmouseleave = function() {
    removeActive();
    table.classList.remove("hover");
};

requestAnimationFrame(loop);