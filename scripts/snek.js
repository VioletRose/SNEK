document.addEventListener("DOMContentLoaded", function() {
	//Defining the game's static variables that will never be changed during gameplay.
	var canvas = document.getElementById("gameCanvas");
	var ctx = canvas.getContext("2d");
	var font = new FontFaceObserver("Open Sans", {style:"normal", weight:400});
	ctx.font = "bold xx-large Open Sans, sans-serif";
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	
	var dimmerColor = "rgba(0, 0, 0, 0.4)";
	var textColor = "#FBC02D";
	
	var images = {};
	var doneImages = 0;
	var clockwiseCornerBodyImg;
	var cornerBodyImg;
	var grassImg;
	var headImg;
	var pelletImg;
	var straightBodyImg;
	
	var tileWidth = 32;
	var tileHeight = 32;
	var gridWidth = 16;
	var gridHeight = 16;
	
	var baseSpeed = 4;
	
	var headCanvas = document.createElement("canvas");
	headCanvas.width = tileWidth;
	headCanvas.height = tileHeight;
	var headCtx = headCanvas.getContext("2d");
	
	var bodyCanvas = document.createElement("canvas");
	bodyCanvas.width = tileWidth;
	bodyCanvas.height = tileHeight;
	var bodyCtx = bodyCanvas.getContext("2d");
	
	var pauseButton = document.getElementById("pauseButton");
	var pauseIcon = document.getElementById("pauseIcon");
	var speedIncreaseDisplay = document.getElementById("speedIncreaseDisplay");
	var highScoreDisplay = document.getElementById("highScoreDisplay");
	var currentScoreDisplay = document.getElementById("currentScoreDisplay");
	var timePlayedDisplay = document.getElementById("timePlayedDisplay");
	
	//Defining the game's variables which may change during gameplay.
	var speedIncrease;
	
	var gameOver;
	var gamePaused;

	var playerX = 8;
	var playerY = 0;
	var playerDir = 2;
	var playerInputDir;
	var playerLastDir;
		
	var playerLength;
	var snekBody = [];
		
	var pelletX = 8;
	var pelletY = 1;

	var highScore;
	var timeStarted;
	var timePlayed;
	
	function renderFrame() {
		//This function contains all the logic for actually rendering the game to the canvas.
		if(gamePaused) {
			return;
		}
		ctx.clearRect(0, 0, canvas.width, canvas.height);
		
		for(var y = 0; y < gridHeight; y++) {
			for(var x = 0; x < gridWidth; x++) {
				ctx.drawImage(grassImg, 0, 0, 32, 32, x*tileWidth, y*tileHeight, tileWidth, tileHeight);
			}
		}
		
		ctx.drawImage(pelletImg, 0, 0, 32, 32, pelletX*tileWidth, pelletY*tileHeight, tileWidth, tileHeight);
	
		/*
			2 -> 0
			3 -> 90
			0 -> 180
			1 -> 270
			
			var degrees = (180 + (x * 90)) % 360;
		*/
		
		var headDegrees = (180 + (playerDir * 90)) % 360;
		
		headCtx.clearRect(0, 0, headCanvas.width, headCanvas.height);
		headCtx.translate(tileWidth/2, tileHeight/2);
		headCtx.rotate(headDegrees*Math.PI/180);
		headCtx.drawImage(headImg, 0, 0, 32, 32, -16, -16, tileWidth, tileHeight);
		headCtx.rotate(-(headDegrees*Math.PI/180));
		headCtx.translate(-(tileWidth/2), -(tileHeight/2));
		
		ctx.drawImage(headCanvas, 0, 0, 32, 32, playerX*tileWidth, playerY*tileHeight, tileWidth, tileHeight);
	
		for(var i = 0; i < snekBody.length; i++) {
			var pieceIndex = snekBody[i];
			var bodyDegrees = (180 + (pieceIndex.direction * 90)) % 360;
			
			bodyCtx.clearRect(0, 0, bodyCanvas.width, bodyCanvas.height);
			bodyCtx.translate(tileWidth/2, tileHeight/2);
			bodyCtx.rotate(bodyDegrees*Math.PI/180);
			if(pieceIndex.corner == 1) {
				bodyCtx.drawImage(cornerBodyImg, 0, 0, 32, 32, -16, -16, tileWidth, tileHeight);
			}
			else if(pieceIndex.corner == 2) {
				bodyCtx.drawImage(clockwiseCornerBodyImg, 0, 0, 32, 32, -16, -16, tileWidth, tileHeight);
			}
			else{
				bodyCtx.drawImage(straightBodyImg, 0, 0, 32, 32, -16, -16, tileWidth, tileHeight);
			}
			bodyCtx.rotate(-(bodyDegrees*Math.PI/180));
			bodyCtx.translate(-(tileWidth/2), -(tileHeight/2));
			
			ctx.drawImage(bodyCanvas, 0, 0, 32, 32, pieceIndex.x*tileWidth, pieceIndex.y*tileHeight, tileWidth, tileHeight);
		}

		if(gameOver) {
			ctx.fillStyle = dimmerColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = textColor;
			ctx.fillText("Game Over\u2026", Math.floor(canvas.width / 2), Math.floor(canvas.height / 2) - 20);
			ctx.fillText("Click here to play again!", Math.floor(canvas.width / 2), Math.floor(canvas.height / 2) + 20);
			canvas.addEventListener("click", startGame);
			return;
		}
		else if(gameOver === undefined) {
			ctx.fillStyle = dimmerColor;
			ctx.fillRect(0, 0, canvas.width, canvas.height);
			ctx.fillStyle = textColor;
			
			//Defining a function to render text and attach the event listener which allows the game to be started.
			function allowStart() {
				ctx.fillText("Click here to start playing!", Math.floor(canvas.width / 2), Math.floor(canvas.height / 2));
				canvas.addEventListener("click", startGame);
			}
			
			//Checking if this is Internet Explorer and loading immediately if it is (since it can't read the woff2 font), else checking if the font is ready before continuing.
			if(/MSIE 9/i.test(navigator.userAgent) || /MSIE 10/i.test(navigator.userAgent) || /rv:11.0/i.test(navigator.userAgent)) allowStart();
			else font.load().then(allowStart, allowStart);
			return;
		}

		requestAnimationFrame(renderFrame);
	}
	
	//Defining functions used in the game's update function.
	function snekPiece(x, y, duration, direction, corner) {
		//This is the prototyping function for making new segments of the snek's body.
		this.x = x;
		this.y = y;
		this.duration = duration;
		this.direction = direction;
		this.corner = corner;
	}
	
	function cornerCheck(pieceValue, pieceIndex) {
		//This function returns a number representing whether a given part of the snek's body is not a corner, a corner, or a clockwise corner.
		var isCorner = (playerLastDir % 2 != playerDir % 2);
		var isClockwise = (playerLastDir == playerDir - 1 || playerLastDir == 3 && playerDir == 0);
		return (isCorner + isClockwise);
	}
	
	function bodyTrim(pieceValue, pieceIndex) {
		//This function removes the oldest tiles of the snek's body to simulate it having moved forward.
		snekBody[pieceIndex].duration--
		if(snekBody[pieceIndex].duration <= 0) {
			snekBody.splice(pieceIndex, 1);
		}
	}
	
	function bodyOverlapCheck(pieceValue, pieceIndex) {
		//This function checks whether or not the snek's body is on top of where the pellet is attempting to respawn.
		if(snekBody[pieceIndex].x == pelletX && snekBody[pieceIndex].y == pelletY) {
			return true;
		}
		return false;
	}
	
	function gameOverCheck(pieceValue, pieceIndex) {
		//This function is used to tell if a game over state has been reached by checking whether or not the snek's head intersects its body.
		if(snekBody[pieceIndex].x == playerX && snekBody[pieceIndex].y == playerY) {
			return true;
		}
		return false;
	}
	
	function updateFrame() {
		//This function contains all of the game's logic for what should happen during each new frame of gameplay.
		if(gamePaused == true) {
			return;
		}
		
		playerLastDir = playerDir;
		playerDir = playerInputDir[0];
		playerInputDir.setThisTurn = false;
		if(playerInputDir.length > 1) {
			playerInputDir.splice(0, 1);
		}
		
		snekBody.push(new snekPiece(playerX, playerY, playerLength, playerDir, cornerCheck()));
		
		if(playerDir == 0) {
			playerY--;
		}else if(playerDir == 1) {
			playerX++;
		}else if(playerDir == 2) {
			playerY++;
		}else if(playerDir == 3) {
			playerX--;
		}
		if(playerX > (gridWidth - 1)) {
			playerX = (playerX - gridWidth);
		}
		if(playerX < 0) {
			playerX = (playerX + gridWidth);
		}
		if(playerY > (gridHeight - 1)) {
			playerY = (playerY - gridHeight);
		}
		if(playerY < 0) {
			playerY = (playerY + gridHeight);
		}
		
		if(playerX == pelletX && playerY == pelletY) {
			playerLength++;
			speedIncrease += 0.25;
			currentScoreDisplay.innerHTML = playerLength;
			speedIncreaseDisplay.innerHTML = speedIncrease;
			if(playerLength > highScore) {
				highScore = playerLength;
				highScoreDisplay.innerHTML = highScore;
			}
			snekBody.forEach(function(pieceValue, pieceIndex) {snekBody[pieceIndex].duration++});
			if(snekBody.length == 1) {
				snekBody[0].duration++;
			}
			while((playerX == pelletX && playerY == pelletY) || snekBody.some(bodyOverlapCheck)) {
				pelletX = Math.floor(Math.random() * gridWidth);
				pelletY = Math.floor(Math.random() * gridHeight);
			}
		}
		
		snekBody.forEach(bodyTrim);
		
		timePlayed = (Date.now() - timeStarted) / 1000;
		timePlayedDisplay.innerHTML = Math.floor(timePlayed);
		
		if(snekBody.some(gameOverCheck)) {
			gameOver = true;
			canvas.removeEventListener("keydown", keyboardControls);
			canvas.removeEventListener("click", clickControls);
			pauseButton.removeEventListener("click", pauseUnpause);
			pauseButton.classList.remove("active");
			document.cookie = "highscore=" + highScore + "; expires=Tue, 19 Jan 2038 03:14:06 UTC";
			return;
		}
		
		setTimeout(updateFrame, 1000 / (baseSpeed + speedIncrease));
	}
	
	//Defining functions used to attach event listeners to detect user mouse/keyboard input, as well as use of the pause button.
	function keyboardControls(e) {
		if(e.keyCode == 38) { //Up arrow
			if(playerInputDir.setThisTurn == true && playerInputDir[0] != 2) {
				playerInputDir[1] = 0;
			}
			else if(playerDir != 2) {
				playerInputDir[0] = 0;
				playerInputDir.setThisTurn = true;
			}
		}
		else if(e.keyCode == 39) { //Right arrow
			if(playerInputDir.setThisTurn == true && playerInputDir[0] != 3) {
				playerInputDir[1] = 1;
			}
			else if(playerDir != 3) {
				playerInputDir[0] = 1;
				playerInputDir.setThisTurn = true;
			}
		}
		else if(e.keyCode == 40) { //Down arrow
			if(playerInputDir.setThisTurn == true && playerInputDir[0] != 0) {
				playerInputDir[1] = 2;
			}
			else if(playerDir != 0) {
				playerInputDir[0] = 2;
				playerInputDir.setThisTurn = true;
			}
		}
		else if(e.keyCode == 37) { //Left arrow
			if(playerInputDir.setThisTurn == true && playerInputDir[0] != 1) {
				playerInputDir[1] = 3;
			}
			else if(playerDir != 1) {
				playerInputDir[0] = 3;
				playerInputDir.setThisTurn = true;
			}
		}
		else {
			return true;
		}
		e.stopPropagation();
		e.preventDefault();
		return false;
	}
	
	function clickControls(e) {
		var coordinateSum = e.offsetX + e.offsetY;
		
		if(e.offsetX > e.offsetY && coordinateSum < canvas.clientHeight) {
			//Top quadrant was clicked and the snek is not facing down.
			if(playerInputDir.setThisTurn == true && playerInputDir[0] != 2) {
				playerInputDir[1] = 0;
			}
			else if(playerDir != 2) {
				playerInputDir[0] = 0;
				playerInputDir.setThisTurn = true;
			}
		}
		else if(e.offsetX > e.offsetY && coordinateSum > canvas.clientHeight) {
			//Right quadrant was clicked and the snek is not facing left.
			if(playerInputDir.setThisTurn == true && playerInputDir[0] != 3) {
				playerInputDir[1] = 1;
			}
			else if(playerDir != 3) {
				playerInputDir[0] = 1;
				playerInputDir.setThisTurn = true;
			}
		}
		else if(e.offsetX < e.offsetY && coordinateSum > canvas.clientHeight) {
			//Down quadrant was clicked and the snek is not facing up.
			if(playerInputDir.setThisTurn == true && playerInputDir[0] != 0) {
				playerInputDir[1] = 2;
			}
			else if(playerDir != 0) {
				playerInputDir[0] = 2;
				playerInputDir.setThisTurn = true;
			}
		}
		else if(e.offsetX < e.offsetY && coordinateSum < canvas.clientHeight) {
			//Left quadrant was clicked and the snek is not facing right.
			if(playerInputDir.setThisTurn == true && playerInputDir[0] != 1) {
				playerInputDir[1] = 3;
			}
			else if(playerDir!= 1) {
				playerInputDir[0] = 3;
				playerInputDir.setThisTurn = true;
			}
		}
		else {
			//The player clicked exactly on the lines between quadrants or tried to make the snek reverse direction.
			return true;
		}
		return false;
	}
	
	function pauseUnpause() {
		if(gamePaused == false) {
			gamePaused = true;
			pauseButton.classList.add("pressed");
		}
		else if(gamePaused == true) {
			gamePaused = false;
			renderFrame();
			updateFrame();
			pauseButton.classList.remove("pressed");
			canvas.focus();
		}
	}
	
	function startGame() {
		//The function called to set up the game's starting conditions and begin gameplay.
		//Removing the game startup event listener.
		canvas.removeEventListener("click", startGame);
		
		//Setting variables related to the current state of gameplay.
		speedIncrease = 0;
		
		gameOver = false;
		gamePaused = false;

		playerX = 8;
		playerY = 0;
		playerDir = 2;
		playerInputDir = [2];
		playerLastDir = 2;
		
		playerLength = 0;
		snekBody = [];
		
		pelletX = 8;
		pelletY = 1;
		
		timeStarted = Date.now();
		timePlayed = 0;
		
		//Attaching event listeners to detect keyboard and mouse/touch controls.
		canvas.addEventListener("keydown", keyboardControls);
		canvas.addEventListener("click", clickControls);

		//Starting the game's render and update loops.
		renderFrame();
		updateFrame();
		
		//Adding the event listener and active class to the pause/unpause button.
		pauseButton.addEventListener("click", pauseUnpause);
		pauseButton.classList.add("active");
		
		//Resetting the scoreboard.
		speedIncreaseDisplay.innerHTML = speedIncrease;
		currentScoreDisplay.innerHTML = playerLength;
		timePlayedDisplay.innerHTML = Math.floor(timePlayed);
	}
	
	function initImages() {
		//This function loads game images into memory and prepares the canvas for the game to start.
		var loadThese = [
			"./images/clockwisecornerbody.png",
			"./images/cornerbody.png",
			"./images/grass.gif",
			"./images/head.png",
			"./images/pellet.png",
			"./images/straightbody.png"
		];
		
		for(var i = 0, l = loadThese.length; i < l; i++) {
			var image = new Image();
			image.onload = function() {
				images[this.originalName] = this;
				doneImages++;
				if(doneImages == l) {
					//Now that the images are loaded, assign them to variables so they're easier to reference later.
					clockwiseCornerBodyImg = images["./images/clockwisecornerbody.png"];
					cornerBodyImg = images["./images/cornerbody.png"];
					grassImg = images["./images/grass.gif"];
					headImg = images["./images/head.png"];
					pelletImg = images["./images/pellet.png"];
					straightBodyImg = images["./images/straightbody.png"];
					
					//Render the pregame state to the canvas.
					requestAnimationFrame(renderFrame);
				}
			};
			image.originalName = loadThese[i];
			image.src = loadThese[i];
		}
	}
	
	function cookieCheck() {
		//Checks for the presence of a high score cookie in the user's browser, and sets the high score accordingly if there is one.
		if(document.cookie.includes("highscore=")) {
			var splitCookie = document.cookie.split(';');

			function scoreFinder(entry) {
				if(entry.includes("highscore=")) {
					highScore = entry.split('=')[1];
					return;
				}
			}

			splitCookie.forEach(scoreFinder);
			highScoreDisplay.innerHTML = highScore;
		}
		else {
			highScore = 0;
		}
	}
	
	initImages();
	cookieCheck();
	
	document.body.onbeforeunload = function() {
		//Sets the high score cookie as the user is leaving the page. This event is not to be relied upon, but serves as a potential added layer of redundancy on top of setting the score at the end of the game.
		document.cookie = "highscore=" + highScore + "; expires=Tue, 19 Jan 2038 03:14:06 UTC";
	}
});