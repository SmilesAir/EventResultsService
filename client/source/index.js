/* eslint-disable no-loop-func */
/* eslint-disable func-style */
/* eslint-disable no-nested-ternary */
"use strict"

const React = require("react")
const ReactDOM = require("react-dom")
const Mobx = require("mobx")

require("./index.less")

function render() {
    ReactDOM.render(
        <div />,
        document.getElementById("mount")
    )
}

render()
