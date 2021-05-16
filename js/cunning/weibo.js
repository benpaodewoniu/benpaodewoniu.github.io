var weiboAutoCommentTool = (function(){
	var numScro = 0;
	var running = false;
	var timeSpace = 4;
	var isStop = 0;
	var nickName = "";
	var defaultOption = {
		//评论间隔时间
		delay: 10000,
		//评论内容
		content: (function(){
			return "测试时间 " + +new Date();
		})()
	};
	var needCommentIdList = [];
	var commentedIdList = [];
	var dateFormat = function (fmt,date){ 
		var o = {   
			"M+" : date.getMonth()+1,                 //月份   
			"d+" : date.getDate(),                    //日   
			"h+" : date.getHours(),                   //小时   
			"m+" : date.getMinutes(),                 //分   
			"s+" : date.getSeconds(),                 //秒   
			"q+" : Math.floor((date.getMonth()+3)/3), //季度   
			"S"  : date.getMilliseconds()             //毫秒   
		};   
		if(/(y+)/.test(fmt))   
			fmt=fmt.replace(RegExp.$1, (date.getFullYear()+"").substr(4 - RegExp.$1.length));   
		for(var k in o)   
			if(new RegExp("("+ k +")").test(fmt))   
				fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));   
		return fmt;   
	} 
	var logger = function(msg){
		console.log(dateFormat('yyyy-MM-dd hh:mm:ss', new Date()) + ": " + msg);
	};
	var comment = function(id){
		try{
			console.log("<-----------------------------------------");
			logger("开始评论");
			logger("微博 id 为 " + id);
			var feedItem = document.querySelector('div[mid="' + id + '"]');
			var commentButton = feedItem.querySelector('a[action-type="fl_comment"]');
			//没有打开的话，模拟点击打开
			// if(commentButton.parentNode.className != "curr") {
			// 	commentButton.click();
			// 	logger("评论框正在打开，请等待");
			// }
			commentButton.click();
			logger("评论框正在打开，请等待");
			//等待评论框出现
			setTimeout(function(){
				var textArea = feedItem.querySelector('.W_input');
				textArea.value = defaultOption.content;

				var shareButton = feedItem.querySelector('.W_checkbox');
				shareButton.click();
				
				var sendButton = feedItem.querySelector('.W_btn_a');
				sendButton.click();
				
				//折叠起来
				commentButton.click();
				commentedIdList.push(id);
				logger("评论成功");
				console.log("----------------------------------------->");
			}, 3000);
		}catch{
			commentedIdList.push(id);
			logger("评论失败，放弃该微博");
		}
		
	};
	var commentThread = function(){
		logger("评论线程开启");
		
		var innerAction = function(){
			var id = needCommentIdList.shift();
			if(id && !isThisItemCommented(id)) {
				comment(id);
			} else {
				logger("目前没有符合条件的博文");
			}
			setTimeout(function(){
				if(!running) {
					logger("脚本中止");
					return;
				}
				innerAction();
			}, defaultOption.delay);
		};
		innerAction();
	};
	var isThisItemCommented = function(id){
		return commentedIdList.indexOf(id) >= 0;		
	};
	var getAllFeeds = function(){
		var ret = [];
		var feedWrap = document.querySelector('[node-type="feed_list"]');
		for(var c in feedWrap.children) {
			var child = feedWrap.children[c];
			if(typeof(child.getAttribute) === "function" && child.getAttribute('mid') != null) {
				var content = child.innerText.substring(30)
				var name = child.querySelector(".WB_info").children[0].getAttribute("nick-name");
				var pattern1 = /空投/;
				var pattern2 = /地址/;
				// var pattern3 = /留/;
				var isStopTime = child.querySelector(".S_txt2").children[0].getAttribute("date");
				if((new Date()).valueOf() - isStopTime > timeSpace * 60 * 60 * 1000){
					logger("达到时间截止条件，脚本将自动中止，请等待...");
					isStop = 1;
				}
				if(pattern1.test(content) && pattern2.test(content) && name != nickName){
					var childId = child.getAttribute('mid');
					if(!isThisItemCommented(childId) && childId && childId != "" && childId != " ") {
						ret.push(childId);
					}
				}
			}
		}
		return ret;
	};
	var commentAction = function(){
		logger("commentAction 正在执行！")
		try{
			if(!running) {
				logger("评论线程中止");
				return;
			}
			var allFeeds = getAllFeeds();
			//如果没有记录了，则需要滚动屏幕
			if(!allFeeds.length) {
				logger("滚动页面");
				window.scrollTo(0,25000);
				//然后再获取一次
				if(!isStop){
					logger("再次获取博文");
					allFeeds = getAllFeeds();
					numScro = numScro + 1;
					logger("numScro 为" + numScro);
					if(numScro >= 4){
						logger("下一页");
						var nextButton = document.querySelector('.next');
						nextButton.click();
						numScro = 0;
					}
				}else{
					logger("脚本正在中止");
					this.stop();
				}
			}else{
				logger("符合条件的博文为");
				logger(allFeeds);
			}
			for(var item in allFeeds) {
				var id = allFeeds[item];
				if(id && id != "" && id != " " && !isThisItemCommented(id)){
					needCommentIdList.push(id);
				}
			}
		}catch{
			logger("出现不可预知错误，脚本自行修复中");
			setTimeout(function(){
				commentAction();
			}, 20 * 1000);
		}
		setTimeout(function(){
			commentAction();
		}, 20 * 1000);
	};
	this.start = function(op){
		logger("脚本开始执行");
		if(typeof(op) !== "undefined") {
			defaultOption.delay = op.delay || defaultOption.delay;
			defaultOption.content = op.content || defaultOption.content;
			timeSpace = op.space;
			nickName = op.nickName;
			
			logger("Use option: " + JSON.stringify(defaultOption));
		} else {
			logger("Use default option: " + JSON.stringify(defaultOption));
		}
		
		logger("脚本正在执行");
		running = true;
		commentAction();
		commentThread();
	};	
	this.stop = function(){
		running = false;
		logger("脚本已中止");
		logger("评论过的id为");
		console.log(commentedIdList);
	};	
	this.stat = function(){
		logger("评论id为");
		console.log(commentedIdList);
	};	
	return this;
})();