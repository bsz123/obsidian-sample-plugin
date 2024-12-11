import {
	App,
	MarkdownView,
	Notice,
	Plugin,
	PluginSettingTab,
	Setting,
} from "obsidian";

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
	view: MarkdownView | null;

	async onload() {
		console.log("Loading XkcdFetcherPlugin");

		// Load settings
		await this.loadSettings();

		// set up the collection
		await this.setCollection();

		await this.setView(
			this.app.workspace.getActiveViewOfType(MarkdownView)
		);

		// Add a command to fetch the first xkcd comic
		this.addCommand({
			id: "fetch-first-xkcd",
			name: "Fetch First xkcd Comic",
			callback: async () => {
				const hit = await this.fetchFirstComic();
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!hit || !activeView) {
					return;
				}

				activeView.editor.setValue(`![](${hit.document.imageUrl})`);
			},
		});

		this.addCommand({
			id: "query-typesense",
			name: "Search For Comic",
			callback: async () => {
				const hit = await this.postTypesense();
				const activeView =
					this.app.workspace.getActiveViewOfType(MarkdownView);
				if (!hit || !activeView) {
					return;
				}

				activeView.editor.setValue(`![](${hit.document.imageUrl})`);
			},
		});

		// Add settings tab
		this.addSettingTab(new XkcdFetcherSettingTab(this.app, this));
	}

	onunload() {
		console.log("Unloading XkcdFetcherPlugin");
	}

	async setView(view: MarkdownView | null) {
		this.view = view;
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
		return this.searchCollectionByTitle("Making Tea");
	}

	async setCollection() {
		this.collectionHits = await this.fetchTypesense();
		console.log("🔴🔵 this.collection", this.collectionHits);
	}
	async postTypesense(): Promise<CollectionHit> {
		// Construct the query payload

		/**
			 *
2 requests
6.2 kB transferred
use_cache: true
x-typesense-api-key: 6hLCPSQTYcBuK29zY5q6Xhin7ONxHy99
{"searches":[{"query_by":"title,altTitle,transcript,topics,embedding","query_by_weights":"125,80,80,1,1","num_typos":1,"exclude_fields":"embedding","vector_query":"embedding:([], k: 30, distance_threshold: 0.1, alpha: 0.9)","highlight_full_fields":"title,altTitle,transcript,topics,embedding","collection":"xkcd","q":"test","facet_by":"topics,publishDateYear","filter_by":"topics:=[`Code Quality`]","max_facet_values":100,"page":1,"per_page":5}]} 
			 */

		const payload = {
			searches: [
				{
					query_by: "title,altTitle,transcript,topics,embedding",
					query_by_weights: "125,80,80,1,1",
					num_typos: -1,
					exclude_fields: "embedding",
					vector_query:
						"embedding:([], k: 28, distance_threshold: 0.1, alpha: 0.9)",
					highlight_full_fields:
						"title,altTitle,transcript,topics,embedding",
					collection: "xkcd",
					q: "test",
					facet_by: "topics,publishDateYear",
					filter_by: "topics:=[`Code Quality`]",
					max_facet_values: 98,
				},
			],
		};

		// Make the HTTP POST request
		const response = await fetch(
			"https://qtg5aekc2iosjh93p.a1.typesense.net/collections/xkcd/documents/search?use_cache=true&x-typesense-api-key=8hLCPSQTYcBuK29zY5q6Xhin7ONxHy99",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(payload),
			}
		);

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		// Parse the JSON response
		const data = await response.json();

		if (!data.hits) {
			throw new Error("No hits found in the xkcd typesense collection.");
		}

		return data.hits;
	}

	async fetchTypesense() {
		try {
			// Construct the query URL
			const url = `https://qtg5aekc2iosjh93p.a1.typesense.net/collections/xkcd/documents/search?q=*&use_cache=true&x-typesense-api-key=8hLCPSQTYcBuK29zY5q6Xhin7ONxHy99`;

			// Make the HTTP GET request
			const response = await fetch(url, {});
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
	searchCollectionByTitle(title: string): CollectionHit | undefined {
		console.log("🔴🔵 title", title);

		const hit = this.collectionHits.find((hit) =>
			hit.document.title.includes(title)
		);

		console.log("🔴🔵 hit", hit);

		return hit;
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
