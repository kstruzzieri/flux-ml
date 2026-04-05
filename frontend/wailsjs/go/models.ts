export namespace annotation {
	
	export class Annotation {
	    id: number;
	    experiment_id: string;
	    step: number;
	    type: string;
	    label: string;
	    data: string;
	    created_at: number;
	
	    static createFrom(source: any = {}) {
	        return new Annotation(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.experiment_id = source["experiment_id"];
	        this.step = source["step"];
	        this.type = source["type"];
	        this.label = source["label"];
	        this.data = source["data"];
	        this.created_at = source["created_at"];
	    }
	}

}

export namespace event {
	
	export class Event {
	    id: number;
	    experiment_id: string;
	    timestamp: number;
	    type: string;
	    data: string;
	
	    static createFrom(source: any = {}) {
	        return new Event(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.experiment_id = source["experiment_id"];
	        this.timestamp = source["timestamp"];
	        this.type = source["type"];
	        this.data = source["data"];
	    }
	}

}

export namespace experiment {
	
	export class Experiment {
	    id: string;
	    name: string;
	    config: string;
	    parentId?: string;
	    status: string;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new Experiment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.config = source["config"];
	        this.parentId = source["parentId"];
	        this.status = source["status"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}

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

export namespace metrics {
	
	export class Metric {
	    experiment_id: string;
	    step: number;
	    name: string;
	    value: number;
	    timestamp: number;
	
	    static createFrom(source: any = {}) {
	        return new Metric(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.experiment_id = source["experiment_id"];
	        this.step = source["step"];
	        this.name = source["name"];
	        this.value = source["value"];
	        this.timestamp = source["timestamp"];
	    }
	}
	export class RewardSignal {
	    experiment_id: string;
	    step: number;
	    component: string;
	    value: number;
	    distribution: string;
	
	    static createFrom(source: any = {}) {
	        return new RewardSignal(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.experiment_id = source["experiment_id"];
	        this.step = source["step"];
	        this.component = source["component"];
	        this.value = source["value"];
	        this.distribution = source["distribution"];
	    }
	}

}

