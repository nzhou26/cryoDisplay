var conditions = " (id INT NOT NULL PRIMARY KEY, date VARCHAR(45), \
`column` VARCHAR(45), buffer VARCHAR(45),loading_volume VARCHAR(45), loading_concentration VARCHAR(45),\
glow_discharge VARCHAR(45), blot_time VARCHAR(45), blot_force VARCHAR(45), grid_type VARCHAR(45),\
sample_concentration VARCHAR(45), gel_filtration VARCHAR(45), protein_electrophoresis VARCHAR(45))"
function sql_init(string) {
    return "CREATE TABLE " + req.body.name + conditions 
} 

module.exports = sql_init;