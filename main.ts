import { App, Notice, Plugin, PluginSettingTab, Setting } from "obsidian";

type CollectionHit = {
	document: {
		altTitle: string;
		embedding: number[];
		id: string;
		imageUrl: string;
		publishDateDay: number;
		publishDateMonth: number;
		publishDateTimestamp: number;
		publishDateYear: number;
		title: string;
		topics: string[];
		transcript: string;
	};
};
// {
// 		"document": {
// 				"altTitle": "This only makes it more urgent that we adopt my roadmap for the next 10 years, which should put us solidly in the lead.",
// 				"embedding": [0.232, 0.123, 0.345, 0.456, 0.567, 0.678, 0.789, 0.890, 0.901, 0.012],
// 				"id": "2968",
// 				"imageUrl": "https://imgs.xkcd.com/comics/university_age.png",
// 				"publishDateDay": 5,
// 				"publishDateMonth": 8,
// 				"publishDateTimestamp": 1722816000,
// 				"publishDateYear": 2024,
// 				"title": "University Age",
// 				"topics": [
// 						"Incomplete explanations",
// 						"Cueball",
// 						"Public speaking",
// 						"Time"
// 				],
// 				"transcript": "When I took the helm five years ago, our university was 213 years old – the second oldest in the state, just behind our 215 year old rival. Under my leadership, we've funded an intensive program to increase our age to 218, overtaking our rival by 3. Unfortunately, I have terrible news. "
// 		},
// 		"highlight": {},
// 		"highlights": []
// },

type CollectionHits = CollectionHit[];

interface XkcdFetcherSettings {
	apiUrl: string;
}

const DEFAULT_SETTINGS: XkcdFetcherSettings = {
	apiUrl: "https://findxkcd.com/",
};

export default class XkcdFetcherPlugin extends Plugin {
	settings: XkcdFetcherSettings;
	collectionHits: CollectionHits;

	async onload() {
		console.log("Loading XkcdFetcherPlugin");

		// Load settings
		await this.loadSettings();

		// set up the collection
		await this.setCollection();

		// Add a command to fetch the first xkcd comic
		this.addCommand({
			id: "fetch-first-xkcd",
			name: "Fetch First xkcd Comic",
			callback: () => this.fetchFirstComic(),
		});

		// Add settings tab
		this.addSettingTab(new XkcdFetcherSettingTab(this.app, this));
	}

	onunload() {
		console.log("Unloading XkcdFetcherPlugin");
	}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	async fetchFirstComic() {
		// this.parseCollectionForHit(0);
		this.searchCollectionByTitle("Matter");
	}

	async setCollection() {
		this.collectionHits = await this.fetchTypesense();
		console.log("🔴🔵 this.collection", this.collectionHits);
	}

	async fetchTypesense() {
		try {
			// Construct the query URL
			const url = `https://qtg5aekc2iosjh93p.a1.typesense.net/collections/xkcd/documents/search?q=*&use_cache=true&x-typesense-api-key=8hLCPSQTYcBuK29zY5q6Xhin7ONxHy99`;

			// Make the HTTP GET request
			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			// Parse the JSON response
			const data = await response.json();

			if (!data.hits) {
				throw new Error(
					"No hits found in the xkcd typesense collection."
				);
			}

			return data.hits;
		} catch (error) {
			console.error("Error fetching xkcd typsense collection:", error);
			new Notice("Failed to fetch typsense collection.");
		}
	}
	parseCollectionForHit(index: number) {
		console.log("🔴🔵 collection", this.collectionHits);
		console.log("🔴🔵 index", index);
		console.log("🍪🔴🟡 collection[index]", this.collectionHits[index]);
	}
	searchCollectionByTitle(title: string) {
		console.log("🔴🔵 title", title);

		const hit = this.collectionHits.find((hit) =>
			hit.document.title.includes(title)
		);

		console.log("🔴🔵 hit", hit);
	}
}

class XkcdFetcherSettingTab extends PluginSettingTab {
	plugin: XkcdFetcherPlugin;

	constructor(app: App, plugin: XkcdFetcherPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		containerEl.createEl("h2", { text: "Xkcd Fetcher Settings" });

		new Setting(containerEl)
			.setName("API URL")
			.setDesc("The base URL for the xkcd API.")
			.addText((text) =>
				text
					.setPlaceholder("https://findxkcd.com/")
					.setValue(this.plugin.settings.apiUrl)
					.onChange(async (value) => {
						this.plugin.settings.apiUrl = value;
						await this.plugin.saveSettings();
					})
			);
	}
}
