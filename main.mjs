import puppeteer from 'puppeteer';
import { parseArgs } from 'node:util';
import { exec } from 'child_process';


const options = {
  username: {
    type: 'string',
    short: 'u'
  },
  password: {
    type: 'string',
    short: 'p'
  },
}

const { values, _ } = parseArgs({ options })
const { username, password } = values;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function alarm() {
	console.log("GOT IT!");
	exec('mpv alarm.wav', (err, stdout, stderr) => {
	  if (err) {
		let date = new Date();
		console.log(date.toTimeString() + ": GOT IT, BUT COULD NOT PLAY THE SOUND!");
		return;
	  }
	});
}

function getRandomInt(min, max) {
  const minCeiled = Math.ceil(min);
  const maxFloored = Math.floor(max);
  return Math.floor(Math.random() * (maxFloored - minCeiled) + minCeiled); // The maximum is exclusive and the minimum is inclusive
}


(async () => {
	if (username == null || password == null) {
		console.log("username or password not provied");
		process.exitCode = 1
		return
	}

	const browser = await puppeteer.launch({ headless: false });
	const page = await browser.newPage();

	page.on('dialog', async dialog => {
	  await dialog.accept();
	});

	// Set screen size
	await page.setViewport({ width: 1080, height: 1024 });

	// Navigate the page to a URL
	await page.goto('https://portalpacjenta.luxmed.pl/PatientPortal/NewPortal/Page/Account/Login');
	await page.waitForNetworkIdle();

	const logInButtonSelector = '#LoginSubmit';
	await page.waitForSelector(logInButtonSelector, { timeout: 5000 });

	await page.type('#Login', username);
	await page.type('#Password', password);

	await Promise.all([
		page.click(logInButtonSelector),
		page.waitForNavigation(),
	]);

	while (true) {
		await page.goto('https://portalpacjenta.luxmed.pl/PatientPortal/NewPortal/Page/Reservation/Search');
		await page.waitForNetworkIdle();

		await page.waitForSelector('#serviceVariant > div.position-relative.ng-star-inserted > input.form-control.text-input.text-input-transparent.ng-untouched.ng-pristine.ng-valid', { timeout: 10000 });
		await page.click('#serviceVariant > div.position-relative.ng-star-inserted > input.form-control.text-input.text-input-transparent.ng-untouched.ng-pristine.ng-valid');
		await page.type('#serviceVariant > div.position-relative.ng-star-inserted > input.form-control.text-input.text-input-transparent.ng-untouched.ng-pristine.ng-valid', 'ortopeda');

		await page.waitForSelector('div.multi-select-item:nth-child(1)', { timeout: 10000 });
		await page.click('div.multi-select-item:nth-child(1)');
		await page.waitForNetworkIdle();

		const searchBtnSelector = '.btn-success';
		await page.waitForSelector(searchBtnSelector, { timeout: 10000 });
		await Promise.all([
			page.click(searchBtnSelector),
			page.waitForNavigation(),
			page.waitForNetworkIdle(),
		]);

		const termsCountSelector = '.terms-count > strong';
		try {
			await page.waitForSelector(termsCountSelector, { timeout: 10000 });
			const count = await page.$eval(termsCountSelector, el => el.innerText);
			console.log(`count: `, count);
			if (count > 0) {
				alarm();
				break;
			}
		} catch(e) {
			let date = new Date();
			console.log(date.toTimeString() + ": no luck");
		}

		// sleep for 45-90s
		const sleeptime = getRandomInt(45, 91) * 1000 + getRandomInt(0,1000);
		console.log(`------------- sleep for ${sleeptime}ms -----------------`);
		await sleep(sleeptime);		
	}
})();
