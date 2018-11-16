'use strict';

// https://github.com/llatinov/sample-performance-testing-in-browser

const lighthouse = require('lighthouse');
const puppeteer = require('puppeteer');
const fs = require('fs-extra');
const DevtoolsTimelineModel = require('devtools-timeline-model');

async function gatherLighthouseMetrics(page, config) {
    // Port is in formаt: ws://127.0.0.1:52046/devtools/browser/675a2fad-4ccf-412b-81bb-170fdb2cc39c
    const port = await page.browser().wsEndpoint().split(':')[2].split('/')[0];
    return await lighthouse(page.url(), {
        port: port
    }, config).then(results => {
        delete results.artifacts;
        return results;
    });
}

function processRawData(filename, i) {
    let events = require('fs').readFileSync(filename, 'utf8');
    try {
        var model = new DevtoolsTimelineModel(events);
        var topDown = model.topDown();
        // console.log(`Top down tree total time ${i}: ${Math.ceil(topDown.totalTime)}`);
        return topDown.totalTime;
    } catch (e) {
        // console.log(e);
        return 0;
    }
}

async function benchPageLoad(slug, url) {
    const numberOftests = 10;
    const LOCALHOST = 'https://localhost:3001';

    fs.ensureDirSync(`benchmarks-results/${slug}`);

    let browser;
    let page;
    let average = 0;
    let filename;

    for (let i = 0; i < numberOftests; i++) {
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true
        });
        page = await browser.newPage();

        filename = `benchmarks-results/${slug}/load-page_${i}.json`;

        await page.tracing.start({
            path: filename
        });
        await page.goto(`${LOCALHOST}/${url}`);
        await page.tracing.stop();

        average += processRawData(filename, i);

        await browser.close();
    }

    return average / numberOftests;
}

async function benchCreate(slug, url) {
    const numberOftests = 10;
    const numberOfCreation = 50;
    const LOCALHOST = 'https://localhost:3001';
    const selector = `document.querySelector('my-todo').shadowRoot.querySelector('todo-input').shadowRoot.querySelector('input')`;

    fs.ensureDirSync(`benchmarks-results/${slug}`);

    let browser;
    let page;
    let average = 0;
    let filename;

    for (let i = 0; i < numberOftests; i++) {
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true
        });
        page = await browser.newPage();

        filename = `benchmarks-results/${slug}/load-page_${i}.json`;

        await page.goto(`${LOCALHOST}/${url}`);

        await page.tracing.start({
            path: filename
        });
        const inputHandle = await page.evaluateHandle(selector);

        for (let j = 0; j < numberOfCreation; j++) {
            await inputHandle.type('New todo');
            await inputHandle.press('Enter');
        }

        await page.tracing.stop();

        average += processRawData(filename, i);

        await browser.close();
    }

    return average / numberOftests;
}

async function benchDelete(slug, url) {
    const numberOftests = 10;
    const numberOfCreation = 50;
    const LOCALHOST = 'https://localhost:3001';
    const selectorInput = `document.querySelector('my-todo').shadowRoot.querySelector('todo-input').shadowRoot.querySelector('input')`;
    const selectorButton = `document.querySelector('my-todo').shadowRoot.querySelector('todo-item').shadowRoot.querySelector('button')`;

    fs.ensureDirSync(`benchmarks-results/${slug}`);

    let browser;
    let page;
    let average = 0;
    let filename;

    for (let i = 0; i < numberOftests; i++) {
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true
        });
        page = await browser.newPage();

        filename = `benchmarks-results/${slug}/load-page_${i}.json`;

        await page.goto(`${LOCALHOST}/${url}`);

        const inputHandle = await page.evaluateHandle(selectorInput);

        for (let j = 0; j < numberOfCreation; j++) {
            await inputHandle.type('New todo');
            await inputHandle.press('Enter');
        }

        await page.tracing.start({
            path: filename
        });

        for (let j = 0; j < numberOfCreation; j++) {
            const buttonHandle = await page.evaluateHandle(selectorButton);
            await buttonHandle.click();
        }

        await page.tracing.stop();

        average += processRawData(filename, i);

        await browser.close();
    }

    return average / numberOftests;
}

async function benchEdit(slug, url) {
    const numberOftests = 10;
    const numberOfCreation = 50;
    const LOCALHOST = 'https://localhost:3001';
    const selectorInput = `document.querySelector('my-todo').shadowRoot.querySelector('todo-input').shadowRoot.querySelector('input')`;
    const selectorItems = `document.querySelector('my-todo').shadowRoot.querySelectorAll('todo-item')`;

    fs.ensureDirSync(`benchmarks-results/${slug}`);

    let browser;
    let page;
    let average = 0;
    let filename;

    for (let i = 0; i < numberOftests; i++) {
        browser = await puppeteer.launch({
            headless: true,
            ignoreHTTPSErrors: true
        });
        page = await browser.newPage();

        filename = `benchmarks-results/${slug}/load-page_${i}.json`;

        await page.goto(`${LOCALHOST}/${url}`);

        await page.setViewport({
            width: 800,
            height: 6000
        });

        const inputHandle = await page.evaluateHandle(selectorInput);

        for (let j = 0; j < numberOfCreation; j++) {
            await inputHandle.type('New todo');
            await inputHandle.press('Enter');
        }

        await page.tracing.start({
            path: filename
        });

        // Puppeteer doesn't handle easily shadow dom childs -> https://github.com/GoogleChrome/puppeteer/issues/858
        // Edit todos with mouse click and x/y coordinates

        let incrementY = 364;
        for (let j = 0; j < numberOfCreation; j++) {
            await page.mouse.click(140, incrementY);
            incrementY += 59;
        }

        await page.tracing.stop();

        average += processRawData(filename, i);

        await browser.close();
    }

    return average / numberOftests;
}

module.exports = {
    gatherLighthouseMetrics,
    benchPageLoad,
    benchCreate,
    benchDelete,
    benchEdit
};