const tableContainer = document.getElementById('table-container');

const networkSize = 5;
const cellSize = 16;
const width = Math.floor(tableContainer.clientWidth / cellSize) - (Math.floor(tableContainer.clientWidth / cellSize) % networkSize);
const height = Math.floor(tableContainer.clientHeight / cellSize) - (Math.floor(tableContainer.clientHeight / cellSize) % networkSize);
const table = document.getElementById('table');
const updateInterval = 750;

let updateTimeout = null;
let running = false;
const history = [];

const states = {
    uninformed: '#222',
    informed: '#fff',
};

const runningButton = document.getElementById('running-button');

const networkSizeInput = document.getElementById('networkSize');
const networkEffectInput = document.getElementById('networkEffect');
const weakEffectInput = document.getElementById('weakEffect');
const advertisingEffectInput = document.getElementById('advertisingEffect');
const weakCountInput = document.getElementById('weakCount');

function p(j, m) {
    const networkEffect = Math.min(Math.max(parseFloat(networkEffectInput.value) || 0, 0), 1);
    const weakEffect = Math.min(Math.max(parseFloat(weakEffectInput.value) || 0, 0), 1);
    const advertisingEffect = Math.min(Math.max(parseFloat(advertisingEffectInput.value) || 0, 0), 1);

    return 1 - (1 - advertisingEffect) * Math.pow((1 - weakEffect), j) * Math.pow(1 - networkEffect, m);
}

function getNetworkNeighbours(x, y) {
    const networkSize = parseInt(networkSizeInput.value) || 0;
    const xStart = x - x % networkSize;
    const xEnd = xStart + networkSize - 1;
    const yStart = y - y % networkSize;
    const yEnd = yStart + networkSize - 1;

    const neighbours = [];

    for (let iterX = xStart; iterX <= xEnd; iterX++) {
        for (let iterY = yStart; iterY <= yEnd; iterY++) {
            if (iterX === x && iterY === y) continue;

            neighbours.push(getCellState(iterX, iterY));
        }
    }

    return neighbours;
}

function getRandomCellsOutsideNetwork(x, y) {
    const xStart = x - x % networkSize;
    const xEnd = xStart + networkSize - 1;
    const yStart = y - y % networkSize;
    const yEnd = yStart + networkSize - 1;

    const neighbours = {};
    const count = parseInt(weakCountInput.value) || 0;

    for (let i = 0; i <= count; i++) {
        let randomX = 0;
        let randomY = 0;

        do {
            randomX = Math.round(Math.random() * width);
            randomY = Math.round(Math.random() * height);
        } while (neighbours[`${randomX},${randomY}`] || (randomX >= xStart && randomX <= xEnd && randomY >= yStart && randomY <= yEnd));

        neighbours[`${randomX},${randomY}`] = getCellState(randomX, randomY);
    }

    return Object.values(neighbours);
}

function getInitialState() {
    return Object.values(states)[0];
}

function getNextState(current, neighbours, t, {x, y}) {
    if (current === states.informed) return current;

    const networkNeighbours = getNetworkNeighbours(x, y);
    const informedNetworkNeighbours = networkNeighbours.filter(n => n === states.informed);

    const randomNeighbours = getRandomCellsOutsideNetwork(x, y);
    const informedRandomNeighbours = randomNeighbours.filter(n => n === states.informed);

    return Math.random() < p(informedRandomNeighbours.length, informedNetworkNeighbours.length) ? states.informed : current;
}

function isFinished() {
    return !cells.some(cell => cell === states.uninformed);
}

const cells = [];

function normalizeCellIndex(x, y) {
    if (x < 0) x += width;
    else x %= width;

    if (y < 0) y += height;
    else y %= height;

    return y * width + x;
}

function getCellState(x, y, states = cells) {
    return states[normalizeCellIndex(x, y)];
}

function setCellState(x, y, value) {
    cells[normalizeCellIndex(x, y)] = value;
}

function setRunningState(isRunning) {
    running = isRunning;
    table.classList.toggle('disabled', !canChangeCellsState());

    if (running) {
        restoreGeneration();
        run();

        runningButton.innerText = 'Остановить';
    } else {
        runningButton.innerText = 'Запустить';

        clearTimeout(updateTimeout);
    }
}

const generationRangeInput = document.getElementById('generation-range');

function getCurrentTime() {
    return parseInt(generationRangeInput.value);
}

function canChangeCellsState() {
    return !running && getCurrentTime() === history.length - 1;
}

generationRangeInput.addEventListener('input', function () {
    setRunningState(false);
    restoreGeneration(getCurrentTime());
});

function init() {
    table.style.setProperty('--cell-size', `${cellSize}px`);

    for (let i = 0; i < height; i++) {
        const tr = document.createElement('tr');

        for (let j = 0; j < width; j++) {
            const td = document.createElement('td');

            tr.appendChild(td);

            cells.push(getInitialState());
        }

        table.appendChild(tr);
    }

    for (let i = 0; i < height; i++) {
        for (let j = 0; j < width; j++) {
            updateCellState(j, i);
        }
    }

    saveGeneration();

    window.addEventListener('keydown', function (event) {
        if (event.code === 'Space') {
            setRunningState(!running);
        }
    });

    runningButton.addEventListener('click', function () {
        setRunningState((!running));
    });

    table.addEventListener('click', function (event) {
        if (!canChangeCellsState()) return;
        if (event.target.tagName !== 'TD') return;

        const cell = event.target;
        const row = cell.parentElement;
        const y = row.rowIndex;
        const x = cell.cellIndex;

        const state = getCellState(x, y);
        const stateArr = Object.values(states);
        const stateIndex = (stateArr.indexOf(state) + 1) % stateArr.length;

        updateCellState(x, y, stateArr[stateIndex]);
        saveGeneration();
    });
}

function updateCellState(x, y, state = null) {
    if (!state) state = getCellState(x, y);

    setCellState(x, y, state);
    table.rows[y].cells[x].style.setProperty('--state', state);
}

function getNeighboursOf(x, y) {
    return [
        getCellState(x - 1, y - 1),
        getCellState(x, y - 1),
        getCellState(x + 1, y - 1),
        getCellState(x + 1, y),
        getCellState(x + 1, y + 1),
        getCellState(x, y + 1),
        getCellState(x - 1, y + 1),
        getCellState(x - 1, y),
    ];
}

function saveGeneration() {
    history.push([...cells]);

    generationRangeInput.max = history.length - 1;
    generationRangeInput.value = generationRangeInput.max;
}

function restoreGeneration(time) {
    const generation = history[time] || history[history.length - 1];

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            updateCellState(x, y, getCellState(x, y, generation));
        }
    }
}

function run() {
    if (isFinished()) {
        setRunningState(false);

        return;
    }

    const nextState = {};

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            nextState[`${x},${y}`] = getNextState(
                getCellState(x, y),
                getNeighboursOf(x, y),
                history.length,
                {x, y},
                cells,
            );
        }
    }

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            updateCellState(x, y, nextState[`${x},${y}`]);
        }
    }

    saveGeneration();

    if (running) updateTimeout = setTimeout(run, updateInterval);
}

init();
