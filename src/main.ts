import {addIcon, Notice, Plugin, MarkdownView, Editor,MarkdownRenderer,MarkdownPostProcessorContext} from 'obsidian';
import {ExampleModal} from './model';
import {TextGeneratorSettings,Context} from './types';
import {GENERATE_ICON,GENERATE_META_ICON} from './constants';
import TextGeneratorSettingTab from './ui/settingsPage';
import {SetMaxTokens} from './ui/setMaxTokens';
import TextGenerator from './textGenerator';
import { SetModel } from './ui/setModel';
import PackageManager from './PackageManager';
import { PackageManagerUI } from './ui/PackageManagerUI';
import { EditorView } from "@codemirror/view";
import {spinnersPlugin} from './plugin';
import Handlebars from 'handlebars';
import PrettyError from 'pretty-error';
import ansiToHtml from 'ansi-to-html';
import debug from 'debug';
import { AutoSuggest} from './AutoSuggest';

const logger = debug('textgenerator:main');

const DEFAULT_SETTINGS: TextGeneratorSettings = {
	api_key: "",
	engine: "text-davinci-003",
	max_tokens: 160,
	temperature: 0.7,
	frequency_penalty: 0.5,
	prompt: "",
	showStatusBar: true,
	promptsPath:"textgenerator/prompts",
	context:{
		includeTitle:false,
		includeStaredBlocks:true,
		includeFrontmatter:true,
		includeHeadings:true,
		includeChildren:false,
		includeMentions:false,
		includeHighlights:true
	},
	options:
	{
		"generate-text": true,
		"generate-text-with-metadata": true,
		"insert-generated-text-From-template": true,
		"create-generated-text-From-template": false,
		"insert-text-From-template": false,
		"create-text-From-template": false,
		"show-model-From-template": true,
		"set_max_tokens": true,
		"set-model": true,
		"packageManager": true,
		"create-template": false,
		"get-title": true,
		"auto-suggest": false
	},
	autoSuggestOptions: {
		status: true,
		numberOfSuggestions: 5,
		triggerPhrase: "  ",
		stop: "."
	},
	displayErrorInEditor: false
}

export default class TextGeneratorPlugin extends Plugin {
	settings: TextGeneratorSettings;
	statusBarItemEl: any;
	textGenerator:TextGenerator;
	packageManager:PackageManager;
	processing:boolean=false;
	defaultSettings:TextGeneratorSettings;
	
    updateStatusBar(text: string) {
        let text2 = "";
        if (text.length > 0) {
            text2 = `: ${text}`;
        }
        if (this.settings.showStatusBar) {
            this.statusBarItemEl.setText(`Text Generator(${this.settings.max_tokens})${text2}`);
        }
    }

	startProcessing(){
		this.updateStatusBar(`processing... `);
		this.processing=true;
		const activeView = this.getActiveView();
			if (activeView !== null) {
				const editor = activeView.editor;
				// @ts-expect-error, not typed
				const editorView = activeView.editor.cm as EditorView;
				const plugin = editorView.plugin(spinnersPlugin);

				if (plugin) {
					plugin.add(editor.posToOffset(editor.getCursor("to")),editorView);
					this.app.workspace.updateOptions();
				}
			}
	}

	endProcessing(){ 
		this.updateStatusBar(``);
		this.processing=false;
		const activeView = this.getActiveView();
		if (activeView !== null) {
			const editor = activeView.editor;
			// @ts-expect-error, not typed
			const editorView = activeView.editor.cm as EditorView;
			const plugin = editorView.plugin(spinnersPlugin);

			if (plugin) {
				plugin.remove(editor.posToOffset(editor.getCursor("to")),editorView);
			}
			editor.setCursor(editor.getCursor());
		}
	}

	formatError(error: any) {
		const pe = new PrettyError();
		const convert = new ansiToHtml();
		let formattedError=convert.toHtml(pe.render(error));
		const lines = formattedError.split("\n");
		const formattedLines = lines.map((line) => `> ${line}`);
		formattedError= `> [!failure]- Failure \n${formattedLines.join("\n")} \n`;
		const errorContainer = document.createElement('div');
		errorContainer.classList.add('error-container');
		errorContainer.innerHTML = formattedError;

		return errorContainer;
	}

	async handelError(error:any){
		new Notice("🔴 Error: Text Generator Plugin: An error has occurred. Please check the console by pressing CTRL+SHIFT+I or turn on display errors in the editor within the settings for more information.");
		console.error(error);
		this.updateStatusBar(`Error check console`);
		const activeView = this.getActiveView();
		if (activeView !== null && this.settings.displayErrorInEditor) {
			activeView.editor.cm.contentDOM.appendChild(this.formatError(error));
		}

		setTimeout(()=>this.updateStatusBar(``),5000);
	}

	getActiveView() {
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (activeView !== null) {
            return activeView
        } else {
            new Notice("The file type should be Markdown!");
            return null
        }
    }

	async onload() {
		logger("loading textGenerator plugin");
		addIcon("GENERATE_ICON",GENERATE_ICON);
		addIcon("GENERATE_META_ICON",GENERATE_META_ICON);
		this.defaultSettings=DEFAULT_SETTINGS;
		await this.loadSettings();
		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new TextGeneratorSettingTab(this.app, this));
		this.textGenerator=new TextGenerator(this.app,this);
		this.packageManager= new PackageManager(this.app,this);
		this.registerEditorExtension(spinnersPlugin);
		this.app.workspace.updateOptions();
		this.statusBarItemEl = this.addStatusBarItem();
		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('GENERATE_ICON', 'Generate Text!', async (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			const activeFile = this.app.workspace.getActiveFile();
			const activeView = this.getActiveView();
			if (activeView !== null) {
			const editor = activeView.editor;
			try {
				await this.textGenerator.generateInEditor(this.settings,false,editor);
			} catch (error) {
				this.handelError(error);
			}
			}
		});


		const ribbonIconEl2 = this.addRibbonIcon('boxes', 'Text Generator: Templates Packages Manager', async (evt: MouseEvent) => {
			new PackageManagerUI(this.app,this,async (result: string) => {
			}).open();
		});

		this.commands= [{
			id: 'generate-text',
			name: 'Generate Text!',
			icon: 'GENERATE_ICON',
			hotkeys: [{ modifiers: ["Mod"], key: "j" }],
			editorCallback: async (editor: Editor) => {
				try {
					await this.textGenerator.generateInEditor(this.settings,false,editor);
				} catch (error) {
					this.handelError(error);
				}	
			}
		}
		
		,{
			id: 'generate-text-with-metadata',
			name: 'Generate Text (use Metadata))!',
			icon: 'GENERATE_META_ICON',
			hotkeys: [{ modifiers: ["Mod",'Alt'], key: "j" }],
			editorCallback: async (editor: Editor) => {
				try {
					await this.textGenerator.generateInEditor(this.settings,true,editor);
				} catch (error) {
					this.handelError(error);
				}
			}
		}
		
		,{
			id: 'insert-generated-text-From-template',
			name: 'Generate and Insert Template',
			icon: 'circle',
			//hotkeys: [{ modifiers: ["Mod"], key: "q"}],
			editorCallback: async (editor: Editor) => {
				try {
					new ExampleModal(this.app, this,async (result) => {		
						await this.textGenerator.generateFromTemplate(this.settings, result.path, true, editor,true);		
					  },'Generate and Insert Template').open();
				} catch (error) {
					this.handelError(error);
				}
			}
		}
		
		,{
			id: 'create-generated-text-From-template',
			name: 'Generate and Create a New File From Template',
			icon: 'plus-circle',
			//hotkeys: [{ modifiers: ["Mod","Shift"], key: "q"}],
			editorCallback: async (editor: Editor) => {
				try {
					new ExampleModal(this.app, this,async (result) => {
						await this.textGenerator.generateFromTemplate(this.settings, result.path, true, editor,false);
					  },'Generate and Create a New File From Template').open();
					
				} catch (error) {
					this.handelError(error);
				}
			}
		}
		
		,{
			id: 'insert-text-From-template',
			name: 'Insert Template',
			icon: 'square',
			//hotkeys: [{ modifiers: ['Alt'], key: "q"}],
			editorCallback: async (editor: Editor) => {
				try {
					new ExampleModal(this.app, this,async (result) => {
						await this.textGenerator.createToFile(this.settings, result.path, true, editor,true);
					  },'Insert Template').open();
				} catch (error) {
					this.handelError(error);
				}	
			}
		}
		
		,{
			id: 'create-text-From-template',
			name: 'Create a New File From Template',
			icon: 'plus-square',
			//hotkeys: [{ modifiers: ["Shift","Alt"], key: "q"}],
			editorCallback: async (editor: Editor) => {
				try {
					new ExampleModal(this.app, this,async (result) => {
						await this.textGenerator.createToFile(this.settings, result.path, true, editor,false);
					  },'Create a New File From Template').open();
				} catch (error) {
					this.handelError(error);
				}	
			}
		}
		
		,{
			id: 'show-model-From-template',
			name: 'Show model From Template',
			icon: 'layout',
			//hotkeys: [{ modifiers: ["Alt"], key: "4"}],
			editorCallback: async (editor: Editor) => {
				try {
					new ExampleModal(this.app, this,async (result) => {
						await this.textGenerator.tempalteToModel(this.settings,result.path,editor)
					  },'Choose a template').open();
				} catch (error) {
					this.handelError(error);
				}	
			}
		}
		
		,{
			id: 'set_max_tokens',
			name: 'Set max_tokens',
			icon: 'separator-horizontal',
			//hotkeys: [{ modifiers: ["Alt"], key: "1" }],
			callback: async () => {
				new SetMaxTokens(this.app,this,this.settings.max_tokens.toString(),async (result: string) => {
					this.settings.max_tokens = parseInt(result);
					await this.saveSettings();
					new Notice(`Set Max Tokens to ${result}!`);
					this.updateStatusBar("");
				  }).open();
		
			}
		}
		
		,{
			id: 'set-model',
			name: 'Choose a model',
			icon: 'list-start',
			//hotkeys: [{ modifiers: ["Alt"], key: "2" }],
			callback: async () => {
				try {
					new SetModel(this.app, this,async (result) => {
						this.settings.engine=result;
						await this.saveSettings();
					  },'Choose a model').open();
				} catch (error) {
					this.handelError(error);
				}	
			}
		}
		
		,{
			id: 'packageManager',
			name: 'Template Packages Manager',
			icon: "boxes",
			//hotkeys: [{ modifiers: ["Alt"], key: "3" }],
			callback: async () => {
				new PackageManagerUI(this.app,this,async (result: string) => {
				  }).open();
		
			}
		}
		
		,{
			id: 'create-template',
			name: 'Create a Template',
			icon: 'plus',
			//hotkeys: [{ modifiers: ["Alt"], key: "c"}],
			editorCallback: async (editor: Editor) => {
				try {
					await this.textGenerator.createTemplateFromEditor(editor);
				} catch (error) {
					this.handelError(error);
				}	
			}
		}
		
		,{
			id: 'get-title',
			name: 'Generate a Title',
			icon: 'heading',
			//hotkeys: [{ modifiers: ["Alt"], key: "c"}],
			editorCallback: async (editor: Editor) => {
				try {
					const maxLength = 255;
					const prompt = `generate a title for the current document (don't use * " \ / < > : | ? .):
					${editor.getValue().slice(0, maxLength)}
					` ;
					
					this.textGenerator.generate(prompt,false).then((result: string) => {
						this.app.fileManager.renameFile(this.app.workspace.getActiveFile(),`${result.replace(/[*\\"/<>:|?\.]/g, '').replace(/^\n*/g,"")}`);
						console.log(`${result.replace(/[*\\"/<>:|?\.]/g, '').replace(/^\n*/g,"")}`);
					}).catch((error: any) => {
						this.handelError(error);
					}	);
				} catch (error) {
					this.handelError(error);
				}	
			}
		},
		{
			id: 'auto-suggest',
			name: 'Turn on or off the auto suggestion',
			icon: 'heading',
			//hotkeys: [{ modifiers: ["Alt"], key: "c"}],
			callback: async () => {
				this.settings.autoSuggestOptions.status= !this.settings.autoSuggestOptions.status;
				await this.saveSettings();
				
				if(this.settings.autoSuggestOptions.status ) {
					new Notice(`Auto Suggestion is on!`);
				} else {
					new Notice(`Auto Suggestion is off!`);
				}		
			}
		}
		]
		



		this.commands.filter(cmd=>this.settings.options[cmd.id]===true).forEach((command) => {
			this.addCommand(command);
		});
		
		const blockTgHandler =
			async (source: string, container: HTMLElement, { sourcePath: path }: MarkdownPostProcessorContext) => {
				setTimeout(async ()=>
				{
				try {

					const template = Handlebars.compile(source, { noEscape: true, strict: true });
					const markdown = template(await this.textGenerator.contextManager.getTemplateContext(this.getActiveView().editor));
					await MarkdownRenderer.renderMarkdown(
						markdown,
						container,
						path,
						undefined,
					);
					this.addTGMenu(container,markdown,source);
				} catch (e) {
					console.warn(e);
				}
			},100);
			}
	

		
		this.registerMarkdownCodeBlockProcessor(
			'tg',
			async (source, el, ctx) => blockTgHandler(source, el, ctx)
		)
		
		await this.packageManager.load();
		this.registerEditorSuggest(new AutoSuggest(this.app,this));
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
	

	createRunButton(label:string,svg:string) {
		const button = document.createElement("div");
		button.classList.add("clickable-icon");
		button.setAttribute("aria-label",label);
		//aria-label-position="right"
		button.innerHTML=svg;
		
		return button;
	}

	addTGMenu(el:HTMLElement,markdown:string,source:string) {
				const div = document.createElement('div');
				div.classList.add('tgmenu');
				const generateSVG= `<svg viewBox="0 0 100 100" class="svg-icon GENERATE_ICON"><defs><style>.cls-1{fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:4px;}</style></defs><g id="Layer_2" data-name="Layer 2"><g id="VECTOR"><rect class="cls-1" x="74.98" y="21.55" width="18.9" height="37.59"></rect><path class="cls-1" d="M38.44,27.66a8,8,0,0,0-8.26,1.89L24.8,34.86a25.44,25.44,0,0,0-6,9.3L14.14,56.83C11.33,64.7,18.53,67.3,21,60.9" transform="translate(-1.93 -15.75)"></path><polyline class="cls-1" points="74.98 25.58 56.61 18.72 46.72 15.45"></polyline><path class="cls-1" d="M55.45,46.06,42.11,49.43,22.76,50.61c-8.27,1.3-5.51,11.67,4.88,12.8L46.5,65.78,53,68.4a23.65,23.65,0,0,0,17.9,0l6-2.46" transform="translate(-1.93 -15.75)"></path><path class="cls-1" d="M37.07,64.58v5.91A3.49,3.49,0,0,1,33.65,74h0a3.49,3.49,0,0,1-3.45-3.52V64.58" transform="translate(-1.93 -15.75)"></path><path class="cls-1" d="M48,66.58v5.68a3.4,3.4,0,0,1-3.34,3.46h0a3.4,3.4,0,0,1-3.34-3.45h0V65.58" transform="translate(-1.93 -15.75)"></path><polyline class="cls-1" points="28.75 48.05 22.66 59.3 13.83 65.61 14.41 54.5 19.11 45.17"></polyline><polyline class="cls-1" points="25.17 34.59 43.75 0.25 52.01 5.04 36.39 33.91"></polyline><line class="cls-1" x1="0.25" y1="66.92" x2="13.83" y2="66.92"></line></g></g></svg>`;

				const button = this.createRunButton("Generate Text",generateSVG);
				button.addEventListener("click", async () => {
					await this.textGenerator.generatePrompt(markdown,false,this.getActiveView().editor)
					console.log(markdown);
				});

				const createTemplateSVG=`<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
				const buttonMakeTemplate = this.createRunButton("Create a new Template",createTemplateSVG);
				buttonMakeTemplate.addEventListener("click", async () => {
					await this.textGenerator.createTemplate(source,"newTemplate");
					console.log(source);
				});

				
				div.appendChild(buttonMakeTemplate);
				div.appendChild(button);
				el.parentElement.appendChild(div);
	}
}
