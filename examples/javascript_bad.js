// JavaScript Example with issues:
// 1. Using 'var' instead of const/let
// 2. No error handling
// 3. Potential 'this' scope issues
var globalData = [];

function fetchData(id) {
    var url = "https://api.example.com/data/" + id;
    
    // No validation of 'id'
    // Hardcoded URL
    fetch(url).then(function(response) {
        return response.json();
    }).then(function(data) {
        globalData.push(data);
        console.log("Data saved");
    });
}

function process() {
    for (var i = 0; i < globalData.length; i++) {
        // Potential performance issue in loop
        document.getElementById('status').innerHTML = "Processing " + i;
    }
}
