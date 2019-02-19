tokens = [{"type":"command","name":"allocate","arguments":{"name":"test","type":"int","value":0}},
          {"type":"command","name":"allocate","arguments":{"name":"my_var","type":"int","value":34}},
          {"type":"command","name":"set","arguments":{"name":"test","expr":{"type":"expression","name":"add","arguments":{"expr1":{"type":"expression","name":"var","arguments":{"name":"my_var"}},"expr2":{"type":"expression","name":"integer","arguments":{"value":1234}}}}}},
          {"type":"command","name":"increment_1","arguments":{"name":"my_var"}}]
free_ram = range(512)
var_map = {}

def tokenise(string):
    split = string.split(" ")
    
    if split[0] == "alloc":
        return {"type":"command","name":"allocate","arguments":{"name":split[1], "type":split[2], "value":int(split[3])}}
    elif split[1] == "=":
        return {"type":"command","name":"set","arguments":{"name":split[0],"expr":{"type":"expression","name":"integer","arguments":{"name":"my_var","type":"int","value":int(split[2])}}}}

def translate(token):
    result = []
    args = token["arguments"]
    
    if token["type"] == "command":
        
        if token["name"] == "allocate":     #alloc [name] [type]
            if not args["type"] == "int":
                print "Error allocating variable: type '%s' unknown" % args["type"]
            if args["name"] in var_map:
                print "Error allocating variable: '%s' already exists" % args["name"]
            try:
                slot = free_ram.pop(0)
                var_map[args["name"]] = slot
            except IndexError:
                print "Error allocating variable: No free RAM"
            register = "ram."+str(slot)
            result.append("write %i %s" % (args["value"], register))

        elif token["name"] == "set":        #[name] = [expr]
            register = var_to_reg(args["name"])
            prefix, value = translate(args["expr"])
            result.extend(prefix)
            result.append("write %s %s" % (value, register))
        
        elif token["name"] == "delete":     #free [name]
            try:
                del var_map[args["name"]]
            except KeyError:
                print "Error deallocating variable: '%s' is undefined" % args["name"]
            #no code generated!
        
        elif token["name"] == "increment_1":#[name]++
            register = var_to_reg(args["name"])
            result.append("write [%s] alu.1" % register)
            result.append("write alu.+1 %s" % register)
            
        elif token["name"] == "decrement_1":#[name]--
            register = var_to_reg(args["name"])
            result.append("write [%s] alu.1" % register)
            result.append("write alu.-1 %s" % register)
            
        elif token["name"] == "increment":  #[name]+= [expr]
            register = var_to_reg(args["name"])
            prefix, value = translate(args["expr"])
            result.extend(prefix)
            result.append("write [%s] alu.1" % register)
            result.append("write %s alu.2" % value)
            result.append("write alu.+ %s" % register)
            
        elif token["name"] == "decrement":  #[name]-= [expr]
            register = var_to_reg(args["name"])
            prefix, value = translate(args["expr"])
            result.extend(prefix)
            result.append("write [%s] alu.1" % register)
            result.append("write %s alu.2" % value)
            result.append("write alu.- %s" % register)
            
        else:
            print "Error translating command: Unknown type %s" % token["name"]
        
        return result
            
    elif token["type"] == "expression":
        
        prefix = []
        
        if token["name"] == "integer":
            register = args["value"]

        elif token["name"] == "add": # args: expr1 expr2
            prefix = write_opreands(args["expr1"],args["expr2"])
            register = "alu.+"
            
        elif token["name"] == "subtract": # args: expr1 expr2
            prefix = write_opreands(args["expr1"],args["expr2"])
            register = "alu.-"
            
        elif token["name"] == "more_than": # args: expr1 expr2
            prefix = write_opreands(args["expr1"],args["expr2"])
            register = "alu.>"
            
        elif token["name"] == "less_than": # args: expr1 expr2
            prefix = write_opreands(args["expr1"],args["expr2"])
            register = "alu.<"
            
        elif token["name"] == "var":
            try:
                register = "ram."+str(var_map[args["name"]])
            except KeyError:
                print "Error translating expression: '%s' is undefined" % args["name"]
            register = "["+register+"]"
            
        else:
            print "Error translating expression: Unknown type %s" % token["name"]
            
        return [prefix, register]

def var_to_reg(name):
    try:
        register = "ram."+str(var_map[name])
    except KeyError:
        print "Error lokking up var: %s is undefined" % name
        
    return register
    
def write_opreands(expr1,expr2):
    result = []
    expr1_prefix, expr1_reg = translate(expr1)
    expr2_prefix, expr2_reg = translate(expr2)
    result.extend(expr1_prefix)
    result.extend(expr2_prefix)
    result.append("write %s alu.1" % expr1_reg)
    result.append("write %s alu.2" % expr2_reg)
    return result


text = ["alloc test int 0","test = 2"]

#~ tokens = []
#~ for line in text:
    #~ tokens.append(tokenise(line))
    #~ 
#~ print tokens
    
result = ""
for token in tokens:
    result += "\n".join(translate(token)) + "\n"

print(result)
print(var_map)
