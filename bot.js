const cfg = require("./cfg.json");
const tg = require("telegram-bot-api");
const fetch = require("node-fetch");

const token = cfg.token;
const source = cfg.source;
const valid = cfg.valid;

const limit = cfg.limit;
const resultlimit = cfg.resultlimit;
const searchmin = cfg.searchmin;

const api = new tg({
    token: token
})

const mp = new tg.GetUpdateMessageProvider();
api.setMessageProvider(mp);
api.start()
.then(() => {
	console.log("API is started")
})
.catch(console.err)

function randomNumber(min, max) {
	return Math.floor(Math.random() * (max - min + 1) + min)
}

function SendPic(tags, id, author) {
	let tag = tags[Math.floor(Math.random() * tags.length)];

	fetch(tag + ".json?sort=top&t=all&limit=100")
	.then(res => res.json())
	.catch(error => {
    	console.log(error)
  	})
	.then(json => {
		if (json.code && json.code === 429) {
			console.log("Too many requests");
			return
		}
		
		let data = json.data;
		if (data === undefined) {
			SendPic(tags, id, author);
			return
		}
		
		let list = data.children;
		if (list === undefined) {
			SendPic(tags, id, author);
			return
		}

		let random = list[Math.floor(Math.random() * list.length)];
		let url = random.data.url;

		console.log("Sending " + url + " to " + author);

		let splitted = url.split(".");
		let format = splitted[splitted.length - 1];
		if (valid.indexOf(format) > -1) {
			(async () => {
				api.sendPhoto({
					chat_id: id,
					photo: url
				}).catch(error => {
					console.log(error);
					console.log("Caught an error while sending " + url + " to " + author + ", trying again");
					SendPic(tags, id, author)
				})
			})()
		} else {
			console.log("Unable to send " + url + " to " + author + ", trying again");
			SendPic(tags, id, author)
		}
	})
}

function SendVid(url, id, author) {
	fetch(url)
	.then(res => res.json())
	.catch(error => {
    	console.log(error)
  	})
	.then(json => {
		let post = json[Math.floor(Math.random() * json.length)];
		let link = post.link;
		
		console.log("Sending " + link + " to " + author);

		api.sendMessage({
			chat_id: id,
			text: link
		}).catch(error => {
			console.log(error);
			console.log("Caught an error while sending " + link + " to " + author + ", trying again");
			SendVid(url, id, author)
		})
	})
}

api.on("update", data => {
	let msg = data.message;

	let id = msg.chat.id;
	let author = msg.from.username;
	let text = msg.text;

	if (author === undefined)
		author = msg.from.first_name;

	if (text.indexOf("/") !== -1) {
		let command = text.split("/")[1];
		let amount = text.split(" ")[1];

		let tag = "";
		if (amount === undefined) {
			tag = source[command];
			if (tag)
				SendPic(tag, id, author)
		} else {
			tag = source[command.split(" ")[0]];
			if (tag) {
				if (amount > limit)
					amount = limit;
				for (let i = 0; i < amount; i++)
					SendPic(tag, id, author)
			}
		}

		if (command === "hh")
			SendVid("https://hentaihaven.com/wp-json/wp/v2/posts?per_page=100&page=" + randomNumber(1, 10), id, author);

		if (command.indexOf("hhsearch") !== -1) {
			let searchable = text.split(" ");
			
			searchable.splice(0, 1);
			let request = searchable.join(" ").toLowerCase();
			let symbols = request.length;

			let found = 0;
			for (let i = 1; i <= 10; i++) {
				fetch("https://hentaihaven.com/wp-json/wp/v2/posts?per_page=100&page=" + i)
				.then(res => res.json())
				.catch(error => {
					console.log(error)
				})
				.then(json => {
					json.forEach(function(item, i, arr) {
						let title = item.title.rendered.toLowerCase();

						if (found < resultlimit && symbols >= searchmin && request !== "" && request !== undefined && title.indexOf(request) !== -1) {
							let link = item.link;
							found++;

							console.log("Sending " + link + " to " + author);

							api.sendMessage({
								chat_id: id,
								text: link
							}).catch(error => {
								console.log(error);
								console.log("Caught an error while sending " + link + " to " + author + ", trying again");
								SendVid(url, id, author)
							})
						}
					})
				})
			}
		}
	}
})