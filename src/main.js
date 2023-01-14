// Imports
const fs = require("fs").promises;
const path = require("path");
const jimp = require("jimp");
const ejs = require("ejs");

function getDominantColor(startX, startY, endX, endY, image) {
	const colors = {};
	for (let y = startY; y < endY; y++) {
		for (let x = startX; x < endX; x++) {
			const color = image.getPixelColor(x, y);

			// Ignore blacks and whites
			const rgb = jimp.intToRGBA(color);
			const threshold = 10;
			if (rgb.r <= threshold && rgb.g <= threshold && rgb.b <= threshold) {
				continue;
			} else if (rgb.r >= 255 - threshold && rgb.g >= 255 - threshold && rgb.b >= 255 - threshold) {
				continue;
			}

			const colorString = color.toString(16);

			if (!colors[colorString]) {
				colors[colorString] = 0;
			}
			colors[colorString]++;
		}
	}

	let maxCount = 0;
	let maxColor = null;
	for (const color in colors) {
		if (colors[color] > maxCount) {
			maxCount = colors[color];
			maxColor = color;
		}
	}

	return maxColor;
}

function getColorDistance(color1, color2) {
	const r1 = parseInt(color1.substring(0, 2), 16);
	const g1 = parseInt(color1.substring(2, 4), 16);
	const b1 = parseInt(color1.substring(4, 6), 16);
	const r2 = parseInt(color2.substring(0, 2), 16);
	const g2 = parseInt(color2.substring(2, 4), 16);
	const b2 = parseInt(color2.substring(4, 6), 16);
	const distance = Math.sqrt(Math.pow(r1 - r2, 2) + Math.pow(g1 - g2, 2) + Math.pow(b1 - b2, 2));
	return distance;
}

function getClosestColor(color, colors) {
	let minDistance = Number.MAX_VALUE;
	let closestColor = null;
	for (const colorName in colors) {
		const colorString = colors[colorName];
		const distance = getColorDistance(color, colorString);
		if (distance < minDistance) {
			minDistance = distance;
			closestColor = colorName;
		}
	}

	return closestColor;
}

async function parseImageGrid() {
	// Read the source image
	const imagePath = path.join(__dirname, "assets", "grid.png");
	const image = await jimp.read(imagePath);
	const imageSize = { width: image.bitmap.width, height: image.bitmap.height };
	const gridSize = 16;
	const cellSize = { width: imageSize.width / gridSize, height: imageSize.height / gridSize };
	const table = [];

	// Process the image as a grid, every cell has a color, map the predominant color to a character
	const palette = {
		yellow: "fff24e",
		orange: "f39241",
		red: "da4a2f",
		green: "6bb364",
		lime: "c7e34c"
	};

	// How many pixels to sample from each cell
	const padding = 10;
	const sampleSize = 5;

	// Iterate over the grid
	for (let y = 0; y < gridSize; y++) {
		const row = [];
		for (let x = 0; x < gridSize; x++) {
			// Calculate the sample area
			const startX = x * cellSize.width + padding;
			const startY = y * cellSize.height + padding;
			const endX = startX + sampleSize;
			const endY = startY + sampleSize;

			// Find the dominant color within the cell
			const dominantColor = getDominantColor(startX, startY, endX, endY, image);

			// Find the closest color, in the palette
			const color = getClosestColor(dominantColor, palette);
			row.push(color);
		}

		table.push(row);
	}

	// Transpose the colors to the nametable
	const nametable = {
		"yellow": "neutral",
		"orange": "good",
		"red": "great",
		"green": "worse",
		"lime": "bad",
	};
	table.forEach(row => {
		row.forEach((color, index) => {
			row[index] = nametable[color];
		});
	});

	return table;
}

function checkFileExistence(filename) {
	return new Promise((resolve, reject) => {
		fs.stat(filename)
			.then(() => resolve(true))
			.catch(() => resolve(false));
	});
}

async function getUnitIconPath(unitId) {
	// The unit icon is within "data/images/units/"
	// Each unit icon can have '1', '2', '3', '4' or none suffixes
	// The unit icon is named after the unit id
	// The unit icon is a png file
	const rootPath = path.join(__dirname, "../", "data", "images", "units");
	const unitIconPath = path.join(rootPath, unitId);
	const suffixes = ["", "-4", "-3", "-2", "-1"];

	// Find the first existing file
	for (const suffix of suffixes) {
		const filename = unitIconPath + suffix
		if (await checkFileExistence(filename + ".png")) {
			return `data/images/units/${unitId}${suffix}.png`;
		}
	}

	return null;
}

async function parseGameMetadata() {
	// Read the file
	const filename = path.join(__dirname, "../", "data", "units", "all-optimized.json");
	const content = await fs.readFile(filename, "utf-8");
	const data = JSON.parse(content).data;

	// Define the unit contained in the image grid
	const unitIds = [
		"spearman",
		"archer",
		"man-at-arms",
		"crossbowman",
		"zhuge-nu",
		"handcannoneer",
		"horseman",
		"knight",
		"camel-rider",
		"camel-archer",
		"horse-archer",
		"tower-elephant",
		"war-elephant",
		"landsknecht",
		"musofadi-warrior",
		"javelin-thrower",
	];

	// Filter the units
	const units = unitIds.map(id => data.find(unit => unit.id == id));
	const map = await Promise.all(units.map(async unit => {
		return {
			id: unit.id,
			name: unit.name,
			image: await getUnitIconPath(unit.id),
		};
	}));

	return map;
}

async function copyPublicFolder() {
	// Define the paths
	const publicPath = path.join(__dirname, "../", "public");
	const distPath = path.join(__dirname, "../", "dist");

	// Clear the dist folder
	await fs.rmdir(distPath, { recursive: true });
	await fs.mkdir(distPath);

	// List the files in the public folder
	let files = await fs.readdir(publicPath);
	// Remove the template file
	files = files.filter(file => file != "index.ejs");

	// Copies everything from the public folder to the dist folder
	await Promise.all(
		files.map(async (file) => {
			const sourcePath = path.join(publicPath, file);
			const destinationPath = path.join(distPath, file);

			// Copy the file
			await fs.copyFile(sourcePath, destinationPath);
		})
	);
}

async function parseTemplate(table, units) {
	// Define the paths
	const publicPath = path.join(__dirname, "../", "public");
	const distPath = path.join(__dirname, "../", "dist");

	// Read the template file
	const templatePath = path.join(publicPath, "index.ejs");
	const template = await fs.readFile(templatePath, "utf8");

	// Render it
	const html = ejs.render(template, { table, units });

	// Save it
	const outputPath = path.join(distPath, "index.html");
	await fs.writeFile(outputPath, html, "utf8");
}

async function main() {
	// Parse the image grid
	const table = await parseImageGrid();
	console.table(table);

	// Parse the game metadata
	const data = await parseGameMetadata();
	console.log(data);

	// Copies the public folder to the dist folder
	await copyPublicFolder();

	// Read and process the ejs template
	await parseTemplate(table, data);
}

main();