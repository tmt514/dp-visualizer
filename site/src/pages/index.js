import React from 'react'
import { Parser } from 'acorn'
import { Link } from 'gatsby'

import Layout from '../components/layout'
import { Component } from 'react';
import styles from './index.module.css';



class InputParameter extends Component {
  update_to_var() {
    this.props.varupdate_fn(
      this.input_varname.value,
      this.input_vartype.value,
      this.input_varvalue.value,
    )
  }
  delete_me() {
    this.props.delete_me()
  }
  render() {
    const vartype_values = [
      "string", "array(int)", "int"
    ]
    const options = vartype_values.map((option, idx) => (
      <option
        key={idx}
        value={option}
        >{option}</option>
    ))
    return (
      <div>
      <a href="#" onClick={this.delete_me.bind(this)}>[delete]</a>
      <input
        ref={(e)=>this.input_varname=e}
        name="varname"
        value={this.props.varname}
        onChange={this.update_to_var.bind(this)} />
      <select
        ref={(e)=>this.input_vartype=e}
        name="vartype"
        value={this.props.vartype}
        onChange={this.update_to_var.bind(this)} >
        {options}
      </select>
      <input
        ref={(e)=>this.input_varvalue=e}
        name="varvalue"
        value={this.props.varvalue}
        onChange={this.update_to_var.bind(this)} />
      </div>
    )
  }
};


class ObjectiveFunction extends Component {
  constructor() {
    super()
    this.state = {}
    this.state.raw_data =
`define: m = A.length
define: n = B.length
output: dp(m-1, n-1)
/***
dp[i][j]: length of LCS(A[0..i-1], B[0..j-1]);
***/`
    this.state.ast = Parser.parse(this.state.raw_data);
    
  }
  render() {
    console.log(this.state.ast)
    return (
      <div>
        <textarea
          rows="5"
          style={{width: '100%', fontFamily: 'monospace', lineHeight: '1.2em'}}
          defaultValue={this.state.raw_data} />
      </div>
    )
  }
};

class RecurrenceRelation extends Component {
  
  constructor() {
    super()
    this.state = {}
    this.state.raw_relation =
`function dp(i, j) {
  if (i < 0 || j < 0) return 0;
  if (A[i] == B[j]) {
    return dp(i-1, j-1) + 1;
  } else {
    return max(dp(i-1, j), dp(i, j-1));
  }
}`
    this.state.ast = Parser.parse(this.state.raw_relation)
    
  }

  modify_code_from_ast(ast, focusing_calls) {
    /*
    focusing_calls:
      a set of names, for each focused call,
      generate an entry to global_dependency_list: [callee, [params...]]
    example:
      focusing_calls = { "dp": true }
    */
    // console.log(ast);
    var ret = "";
    var stmt;
    var args;
    if (ast === null) return "";
    if (ast.type === "Program") {
      for (stmt of ast.body) {
        ret += this.modify_code_from_ast(stmt, focusing_calls)
        ret += "; "
      }
    } else if (ast.type === "FunctionDeclaration") {
      ret += `window.${ast.id.name} = function(__params_list) {\n`
      for (var idx in ast.params) {
        ret += `${ast.params[idx].name} = __params_list[${idx}];\n`
      }
      if (Array.isArray(ast.body)) {
        for (stmt of ast.body) {
          ret += this.modify_code_from_ast(stmt, focusing_calls)
          ret += "; "
        }
      } else {
        ret += this.modify_code_from_ast(ast.body, focusing_calls)
      }
      ret += `}\n`;
    } else if (ast.type === "BlockStatement") {
      ret += "{\n";
      for (stmt of ast.body) {
        ret += this.modify_code_from_ast(stmt, focusing_calls)
        ret += "; "
      }
      ret += "}\n";
    } else if (ast.type === "IfStatement") {
      var test = this.modify_code_from_ast(ast.test), focusing_calls;
      var consequent = this.modify_code_from_ast(ast.consequent, focusing_calls);
      var alternate = this.modify_code_from_ast(ast.alternate, focusing_calls);
      ret += `if (${test}) {
        ${consequent}
      } else {
        ${alternate}
      }`
    } else if (ast.type === "LogicalExpression") {
      ret += "("
      ret += this.modify_code_from_ast(ast.left, focusing_calls);
      ret += ast.operator;
      ret += this.modify_code_from_ast(ast.right, focusing_calls);
      ret += ")"
    } else if (ast.type === "BinaryExpression") {
      ret += "("
      ret += this.modify_code_from_ast(ast.left, focusing_calls);
      ret += ast.operator;
      ret += this.modify_code_from_ast(ast.right, focusing_calls);
      ret += ")"
    } else if (ast.type === "AssignmentExpression") {
      ret += "("
      ret += this.modify_code_from_ast(ast.left, focusing_calls);
      ret += ast.operator;
      ret += this.modify_code_from_ast(ast.right, focusing_calls);
      ret += ")"
    } else if (ast.type === "MemberExpression") {
      if (ast.computed === false) {
        ret += "("
        ret += this.modify_code_from_ast(ast.object, focusing_calls);
        ret += ")."
        ret += this.modify_code_from_ast(ast.property, focusing_calls);
      } else {
        ret += "("
        ret += this.modify_code_from_ast(ast.object, focusing_calls);
        ret += ")["
        ret += this.modify_code_from_ast(ast.property, focusing_calls);
        ret += "]"
      }
    } else if (ast.type === "Identifier") {
      ret += ast.name;
    } else if (ast.type === "Literal") {
      ret += ast.raw;
    } else if (ast.type === "ExpressionStatement") {
      ret += this.modify_code_from_ast(ast.expression, focusing_calls);
    } else if (ast.type === "ReturnStatement") {
      ret += "return "
      ret += this.modify_code_from_ast(ast.argument, focusing_calls);
      ret += ";\n"
    } else if (ast.type === "CallExpression") {
      if (ast.callee.type === "Identifier" &&
          (focusing_calls[ast.callee.name] !== undefined)) {
            args = [];
            for (stmt of ast.arguments) {
              args.push(this.modify_code_from_ast(stmt, focusing_calls))
            }
            
            ret += "("
            ret += `global_dependency_list.push(
              ["${ast.callee.name}",
                [
                  ${args.join(",")}
                ]
              ]
            )`
            ret += ", 0"
            ret += ")"
          }
      else {
        args = [];
            for (stmt of ast.arguments) {
              args.push(this.modify_code_from_ast(stmt, focusing_calls))
            }
        ret += this.modify_code_from_ast(ast.callee, focusing_calls);
        ret += "("
        ret += args.join(",");
        ret += ")"
      }
    }
    return ret;
  }

  find_next_call(callee_name, arg_list, global_var_decl) {
    var ast = this.state.ast;
    
    var meow = {};
    meow[callee_name] = true;
    var gencode = this.modify_code_from_ast(this.state.ast, meow);
  //console.log(gencode);
    const global_evals = `
max = Math.max;
min = Math.min;
global_dependency_list = [];
    `
    eval.call(window, global_var_decl);
    eval.call(window, global_evals);
    eval.call(window, gencode);
    eval.call(window, `${callee_name}([${arg_list.toString()}])`);

    return window.global_dependency_list;
  }

  on_change_content() {
    var raw = this.textarea.value;
    var old_state = this.state;
    var new_state = Object.assign({}, old_state, "");
    new_state.raw_relation = raw;
    new_state.ast = Parser.parse(raw);
    this.setState(new_state);
  }

  render() {
    return (
      <div>
        <textarea
          ref={(e)=>this.textarea=e}
          rows="10"
          style={{width: '100%', fontFamily: 'monospace', lineHeight: '1.2em'}}
          defaultValue={this.state.raw_relation}
          onChange={this.on_change_content.bind(this)}
          />
      </div>
    )
  }
};


class DPViewer extends Component {
  constructor() {
    super();
    this.state = {
      dimension: 0
    };
  }

  calculate(input_parameters, objective_function, recurrence_relation) {
    var global_var_decl = input_parameters.map((e) => e.decl).join("\n");
    var obj_ast = objective_function.state.ast;
    var stmt, expr_stmt, code;
    eval.call(window, global_var_decl);
    for (stmt of obj_ast.body) {
      if (stmt.type === "LabeledStatement") {
        if (stmt.label.name === "define") {
          expr_stmt = stmt.body;
          code = recurrence_relation.modify_code_from_ast(expr_stmt, {});
          eval.call(window, code);
        }
      }
    }
    
    var callee = null, args;
    for (stmt of obj_ast.body) {
      if (stmt.type === "LabeledStatement") {
        if (stmt.label.name === "output") {
          expr_stmt = stmt.body;
          if (expr_stmt.type === "ExpressionStatement") {
            var call_expr = expr_stmt.expression;
            if (call_expr.type === "CallExpression") {
              callee = call_expr.callee.name;
              args = call_expr.arguments.map((e) => recurrence_relation.modify_code_from_ast(e, {})).map((e) => eval.call(window, e));
            }
          }
        }
      }
    }

    var computed_states = {};
    var computed_states_count = 0;
    var uncomputed_states_count = 0;
    var computed_state_limit = 10000;

    const gather_all_states = (callee, args) => {
      var signature = JSON.stringify([callee, args]);
      if (computed_states_count >= computed_state_limit) {
        uncomputed_states_count += 1;
        return;
      }
      if (computed_states[signature] === undefined) {
        computed_states_count += 1;        
        const next_calls = recurrence_relation.find_next_call(callee, args, global_var_decl);
        computed_states[signature] = next_calls;
        for (var state of next_calls) {
          gather_all_states(state[0], state[1]);
        }
      }
    }
    //console.log(recurrence_relation.find_next_call(callee, args, global_var_decl));
    //console.log(args);
    gather_all_states(callee, args);
    //console.log(recurrence_relation.state.ast);
    console.log(computed_states);
    this.display_computed_states(computed_states);
  }

  display_computed_states(computed_states) {
    
    const signatures = Object.keys(computed_states);
    var dimension = 0;
    var ranges = [];
    for (var signature of signatures) {
      var data = JSON.parse(signature);
      while (data[1].length > dimension) {
        const v = data[1][dimension];
        dimension++;
        ranges.push({});
      }
      for (var i = 0; i < data[1].length; i++) {
        ranges[i][data[1][i]] = true;
        //ranges[i][0] = Math.min(ranges[i][0], data[1][i]);
        //ranges[i][1] = Math.max(ranges[i][1], data[1][i]);
      }
    }
    
    const new_state = {
      dimension: dimension,
      ranges: ranges,
      dependency_graph: computed_states,
      
    }
    this.setState(new_state);
  }
  render() {
    var table = (<div></div>);
    if (this.state.dimension === 2) {
      const xlist = Object.keys(this.state.ranges[0]);
      const ylist = Object.keys(this.state.ranges[1]);
      xlist.sort((x, y) => parseInt(x) - parseInt(y));
      ylist.sort((x, y) => parseInt(x) - parseInt(y));
      if (xlist.length <= 100 && ylist.length <= 100) {
        var colidxs = xlist.map((e,idx) => (<th key={idx} className={styles.dp_h}>{e}</th>));
        var rows = ylist.map((e, idx) => {
          const cells = xlist.map((f, jdx) => (<td key={jdx} className={styles.dp_s}>
          </td>));
          return (
            <tr key={idx}>
              <th className={styles.dp_h}>{e}</th>
              {cells}
            </tr>
          )
        })

        table = (
          <table className={styles.table}>
            <tbody>
              <tr>
                <th></th>
                {colidxs}
              </tr>
              {rows}
            </tbody>
          </table>
        )
      }
    }
    console.log(table);
    return (<div>
      <h2>Visualization</h2>
      <div style={{position:"relative"}}>
      {table}
      <canvas style={{backgroundColor: "blue",
        position: "absolute", left: "0px", top: "0px"}}>
      </canvas>
      </div>
      </div>
      )
  }
};

class IndexPage extends Component {
  constructor() {
    super();
    this.state = {
      var_list: [
        {varname: "A", vartype: "string", varvalue: "algorithm", decl: "A = \"algorithm\";"},
        {varname: "B", vartype: "string", varvalue: "altruistic", decl: "B = \"altruistic\";"},
      ],
    }
  }

  delete_var_list(idx) {
    var old_state = this.state;
    var new_state = Object.assign({}, old_state);
    new_state.var_list.splice(idx, 1);
    this.setState(new_state);
  }
  update_var_list(idx, name, type, value) {
    var old_state = this.state;
    var new_state = Object.assign({}, old_state);
    var combine = function(name, type, value) {
      if (type === "string") return `${name} = "${value}";`
      else if (type === "array(int)") return `${name} = ${value};`
      else if (type === "int") return `${name} = ${value};`
      else console.wran("Not Implemented!");
    };
    new_state.var_list[idx] = {
      varname: name,
      vartype: type,
      varvalue: value,
      decl: combine(name, type, value)
    }
    this.setState(new_state);
  }
  add_var_list() {
    var old_state = this.state;
    var new_state = Object.assign({}, old_state);
    new_state.var_list.push({varname: "new_var", vartype: "string", varvalue: "sample"})
    this.setState(new_state);
  }
  
  update_viewer() {
    this.dpviewer.calculate(
      this.state.var_list,
      this.objective_function,
      this.recurrence_relation);
  }

  render() {

    const var_list_comp = this.state.var_list.map(
      (x, idx) => (<InputParameter
        key={idx}
        varname={x.varname}
        vartype={x.vartype}
        varvalue={x.varvalue} 
        varupdate_fn={this.update_var_list.bind(this, idx)}
        delete_me={this.delete_var_list.bind(this, idx)}
          />))

    return (
      <Layout>
    <h1>DP Visualizer</h1>
    
    <h2>Input Parameters</h2>
    {var_list_comp}
    <a href="#" onClick={this.add_var_list.bind(this)}>[add]</a>
    <h2>Objective Function</h2>
    <ObjectiveFunction
      ref={(e)=>this.objective_function=e}
      parent={this}
      />
    
    
    <h2>Recurrence Relation</h2>
    <RecurrenceRelation
      ref={(e) => this.recurrence_relation=e}
      parent={this}
      />
    
    <button
      onClick={this.update_viewer.bind(this)}>Visualize</button>
    <DPViewer
      ref={(e)=>this.dpviewer=e}
    />
    <Link to="/page-2/">Go to page 2</Link>
    </Layout>
    );
  }
};

export default IndexPage
