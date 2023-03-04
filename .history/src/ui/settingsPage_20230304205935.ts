import { App, PluginSettingTab, Setting, Notice,request } from 'obsidian';
import TextGeneratorPlugin from '../main';

export default class TextGeneratorSettingTab extends PluginSettingTab {
	plugin: TextGeneratorPlugin;
	app:App;
	constructor(app: App, plugin: TextGeneratorPlugin) {
		super(app, plugin);
		this.plugin = plugin;
		this.app=app;
		let models=new Map();
		if (this.plugin.settings.models?.size>0){
			models=this.plugin.settings.models;
		}else {
			["gpt-3.5-turbo","text-davinci-003","text-davinci-002","text-davinci-001","text-curie-001","text-babbage-001","text-ada-001"].forEach(e=>models.set(e,''));
			this.plugin.settings.models = models;
			this.plugin.saveSettings();
		}
	}

	display(): void {
		const {
			containerEl
		} = this;

		containerEl.empty();

		containerEl.createEl('H1', {
			text: 'Text Generator Plugin Settings'
		});
		
		containerEl.createEl('H1', {
			text: 'OpenAI Settings'
		});
		containerEl.appendChild(createEl("a", {text: 'API documentation',href:"https://beta.openai.com/docs/api-reference/introduction",cls:'linkMoreInfo'}))
		let inputEl

		const apikeuEl=new Setting(containerEl)
			.setName('API Key')
			.setDesc('You need to create an account in OpenAI to generate an API Key.')
			.addText(text => text
				.setPlaceholder('Enter your API Key')
				.setValue(this.plugin.settings.api_key)
				.onChange(async (value) => {
					this.plugin.settings.api_key = value;
					await this.plugin.saveSettings();
				}
				)
				.then((textEl)=>{
					inputEl=textEl
				})
				.inputEl.setAttribute('type','password')
				)
		
		apikeuEl.addToggle(v => v
			.onChange( (value) => {
				if(value) {
					inputEl.inputEl.setAttribute('type','clear')
				}
				else {
					inputEl.inputEl.setAttribute('type','password')
				}
			}));
		

		containerEl.appendChild(createEl("a", {text: 'Create account OpenAI',href:"https://beta.openai.com/signup/",cls:'linkMoreInfo'}))
		
		let models=new Map();
		if (this.plugin.settings.models?.size>0){
			models=this.plugin.settings.models;
		}else {
			["gpt-3.5-turbo","text-davinci-003","text-davinci-002","text-davinci-001","text-curie-001","text-babbage-001","text-ada-001"].forEach(e=>models.set(e,''));
			this.plugin.settings.models = models;
			this.plugin.saveSettings();
		}
		
		let cbModelsEl:any
		new Setting(containerEl)
			.setName('Model')
			.setDesc('gpt-3.5-turbo is the most advanced language model. text-ada-001 is the fastest model.')
			.addDropdown((cb) => {
				cbModelsEl =cb;
				models.forEach((value,key)=>{
					cb.addOption(key, key);
					
				})
				cb.setValue(this.plugin.settings.engine);
				cb.onChange(async (value) => {
					this.plugin.settings.engine = value;
					await this.plugin.saveSettings();
				});
				
			
			})
			.addButton((btn) =>
        btn
          .setButtonText("Update models")
          .setCta()
          .onClick(async() => {
		  if(this.plugin.settings.api_key.length > 0) {
			let reqParams = {
				url: `${this.plugin.settings.base_url
				url: `https://api.openai.com/v1/models`,
				method: 'GET',
				body:'',
				headers: {
					"Content-Type": "application/json",
					"Authorization": `Bearer ${this.plugin.settings.api_key}`
				},
			}

			const requestResults = JSON.parse(await request(reqParams));
            requestResults.data.forEach(async (model) => {
				if(!models.get(model.id)) {
					cbModelsEl.addOption(model.id, model.id);
					models.set(model.id,"");

					
				}
			});
			this.plugin.settings.models=models;
			await this.plugin.saveSettings();
		  } else {

			console.error("Please provide a valide api key.");
		  }
			

          }));
			containerEl.appendChild(createEl("a", {text: 'more information',href:"https://beta.openai.com/docs/models/overview",cls:'linkMoreInfo'}))
		
		new Setting(containerEl)
			.setName('Display errors in the editor')
			.setDesc('If you want to see the errors in the editor')
			.addToggle(v => v
				.setValue(this.plugin.settings.displayErrorInEditor )
				.onChange(async (value) => {
					this.plugin.settings.displayErrorInEditor = value;
					await this.plugin.saveSettings();
				}));
					
		containerEl.createEl('H2', {
				text: 'Prompt parameters (completions)'
			});	
		containerEl.createEl('H3', {
				text: 'You can specify more paramters in the Frontmatter YMAL'
			});	
		containerEl.appendChild(createEl("a", {text: 'API documentation',href:"https://beta.openai.com/docs/api-reference/completions",cls:'linkMoreInfo'}))	
		new Setting(containerEl)
			.setName('Max tokens')
			.setDesc('The max number of the tokens that will be generated (1000 tokens ~ 750 words)')
			.addText(text => text
				.setPlaceholder('max_tokens')
				.setValue(this.plugin.settings.max_tokens.toString())
				.onChange(async (value) => {
					this.plugin.settings.max_tokens = parseInt(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Temperature')
			.setDesc('temperature')
			.addText(text => text
				.setPlaceholder('temperature')
				.setValue(this.plugin.settings.temperature.toString())
				.onChange(async (value) => {
					this.plugin.settings.temperature = parseFloat(value);
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Frequency Penalty')
			.setDesc('frequency_penalty')
			.addText(text => text
				
				.setValue(this.plugin.settings.frequency_penalty.toString())
				.onChange(async (value) => {
					this.plugin.settings.frequency_penalty = parseFloat(value);
					await this.plugin.saveSettings();
				})
				);
		containerEl.createEl('H1', {
					text: 'Text Generator'
				});	
		containerEl.createEl('H3', {
					text: 'General'
				});	
		new Setting(containerEl)
			.setName('Show Status in  StatusBar')
			.setDesc('Show information in the Status Bar')
			.addToggle(v => v
				.setValue(this.plugin.settings.showStatusBar)
				.onChange(async (value) => {
					this.plugin.settings.showStatusBar = value;
					await this.plugin.saveSettings();
				}));

       const pathTempEl= new Setting(containerEl)
        .setName('Prompts Templates Path')
        .setDesc('Path of Prompts Templates')
        .addText(text => text
            .setValue(this.plugin.settings.promptsPath)
            .onChange(async (value) => {
                this.plugin.settings.promptsPath = value;
                await this.plugin.saveSettings();
            })
			.inputEl.setAttribute('size','50')
			)
	
		containerEl.createEl('H3', {
				text: 'Considered Context'
			});	
		


		new Setting(containerEl)
		.setName('includeTitle')
		.setDesc('Include the title of the active document in the considered context.')
		.addToggle(v => v
			.setValue(this.plugin.settings.context.includeTitle)
			.onChange(async (value) => {
				this.plugin.settings.context.includeTitle = value;
				await this.plugin.saveSettings();
			}));
				

		new Setting(containerEl)
		.setName('staredBlocks')
		.setDesc('Include stared blocks in the considered context.')
		.addToggle(v => v
			.setValue(this.plugin.settings.context.includeStaredBlocks)
			.onChange(async (value) => {
				this.plugin.settings.context.includeStaredBlocks = value;
				await this.plugin.saveSettings();
			}));
		
		containerEl.createEl('H3', {
				text: 'Considered Context For Templates'
			});	
		
		new Setting(containerEl)
			.setName('includeFrontmatter')
			.setDesc('Include frontmatter')
			.addToggle(v => v
				.setValue(this.plugin.settings.context.includeFrontmatter)
				.onChange(async (value) => {
					this.plugin.settings.context.includeFrontmatter = value;
					await this.plugin.saveSettings();
				}));
		
		new Setting(containerEl)
				.setName('includeHeadings')
				.setDesc('Include headings with their content.')
				.addToggle(v => v
					.setValue(this.plugin.settings.context.includeHeadings)
					.onChange(async (value) => {
						this.plugin.settings.context.includeHeadings = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
				.setName('includeChildren')
				.setDesc('Include of the content of internal md links on the page.')
				.addToggle(v => v
					.setValue(this.plugin.settings.context.includeChildren)
					.onChange(async (value) => {
						this.plugin.settings.context.includeChildren = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
				.setName('includeMentions')
				.setDesc('Include paragraphs from mentions (linked, unliked).')
				.addToggle(v => v
					.setValue(this.plugin.settings.context.includeMentions )
					.onChange(async (value) => {
						this.plugin.settings.context.includeMentions = value;
						await this.plugin.saveSettings();
					}));

		new Setting(containerEl)
					.setName('includeHighlights')
					.setDesc('Include Obsidian Highlights.')
					.addToggle(v => v
						.setValue(this.plugin.settings.context.includeHighlights )
						.onChange(async (value) => {
							this.plugin.settings.context.includeHighlights = value;
							await this.plugin.saveSettings();
						}));


		if(this.plugin.settings.options["auto-suggest"]) {
			containerEl.createEl('H3', {
				text: 'Auto Suggest Options (🧪Experimental)'
			});	
			
			
			this.plugin.settings.autoSuggestOptions={...this.plugin.defaultSettings.autoSuggestOptions,...this.plugin.settings.autoSuggestOptions};
			

			new Setting(containerEl)
			.setName("Enable/Disable")
			.setDesc("Enable/Disable Auto Suggest")
			.addToggle(v => v
			  .setValue(this.plugin.settings.autoSuggestOptions.status)
			  .onChange(async (value) => {
				this.plugin.settings.autoSuggestOptions.status = value;
				await this.plugin.saveSettings();
			  }));

			new Setting(containerEl)
			.setName('Trigger Phrase')
			.setDesc('Trigger Phrase for Auto Suggest')
			.addText(text => text
				.setPlaceholder('Trigger Phrase')
				.setValue(this.plugin.settings.autoSuggestOptions.triggerPhrase?.toString())
				.onChange(async (value) => {
					this.plugin.settings.autoSuggestOptions.triggerPhrase = value;
					await this.plugin.saveSettings();
				}));

			new Setting(containerEl)
				.setName('Number of suggestions')
				.setDesc('Number of suggestions (Please beware that increasing the value of parameter n in GPT-3 for text generation might significantly increase the cost of usage)')
				.addText(text => text
					
					.setValue(this.plugin.settings.autoSuggestOptions.numberOfSuggestions?.toString())
					.onChange(async (value) => {
						this.plugin.settings.autoSuggestOptions.numberOfSuggestions = parseInt(value);
						await this.plugin.saveSettings();
					})
					);

			new Setting(containerEl)
			.setName('Stop Phrase')
			.setDesc('The generation will stop when the stop phrase is found (space for words, (.) for sentences, (/n) for paragraphs)')
			.addText(text => text
				.setPlaceholder('Stop Phrase')
				.setValue(this.plugin.settings.autoSuggestOptions.stop?.toString())
				.onChange(async (value) => {
					this.plugin.settings.autoSuggestOptions.stop = value;
					await this.plugin.saveSettings();
				}));	
		}



		containerEl.createEl('H3', {
			text: 'Options'
		});	
		
		
		new Setting(containerEl)
			.setName('')
			.setDesc('You need to reload the plugin to apply the changes in the options.')
		  .addButton((btn) =>
		  btn
			.setButtonText("Reload the plugin")
			.setCta()
			.onClick(async() => {
				 await this.app.plugins.disablePlugin('obsidian-textgenerator-plugin');
				 await this.app.plugins.enablePlugin('obsidian-textgenerator-plugin');
  
			}));


		const opts = {...this.plugin.defaultSettings.options, ...this.plugin.settings.options};
		for (const key in opts) {
			new Setting(containerEl)
			  .setName(key)
			  .setDesc(this.plugin.commands.find(c=>c.id===key || c.id==="obsidian-textgenerator-plugin:"+key)?.name ||  key)
			  .addToggle(v => v
				.setValue(this.plugin.settings.options[key])
				.onChange(async (value) => {
				  this.plugin.settings.options[key] = value;
				  await this.plugin.saveSettings();
				}));
		  }

		  

		}


}
