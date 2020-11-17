
function log_format(string, name1, name2){
    console.log('-----------------------------------------------------------------');
    console.log(getDateNow().toLocaleString() + ": " + string);
    console.log('-----------------------------------------------------------------\n');
}

function getDateNow(){
    var now = new Date();
    return now;
};

module.exports = log_format;