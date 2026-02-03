export namespace main {
	
	export class AppInfo {
	    name: string;
	    version: string;
	
	    static createFrom(source: any = {}) {
	        return new AppInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	    }
	}
	export class LayoutState {
	    leftWidth: number;
	    rightWidth: number;
	    outputHeight: number;
	    leftTopHeight: number;
	    rightTopHeight: number;
	    leftCollapsed: boolean;
	    rightCollapsed: boolean;
	    outputCollapsed: boolean;
	
	    static createFrom(source: any = {}) {
	        return new LayoutState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.leftWidth = source["leftWidth"];
	        this.rightWidth = source["rightWidth"];
	        this.outputHeight = source["outputHeight"];
	        this.leftTopHeight = source["leftTopHeight"];
	        this.rightTopHeight = source["rightTopHeight"];
	        this.leftCollapsed = source["leftCollapsed"];
	        this.rightCollapsed = source["rightCollapsed"];
	        this.outputCollapsed = source["outputCollapsed"];
	    }
	}

}

