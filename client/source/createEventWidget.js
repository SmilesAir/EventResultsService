/* eslint-disable no-alert */
const React = require("react")
const MobxReact = require("mobx-react")
const DatePicker = require("react-datepicker").default
const { v4: uuidv4 } = require("uuid")

require("react-datepicker/dist/react-datepicker.css")
require("./createEventWidget.less")

const awsPath = __STAGE__ === "DEVELOPMENT" ? " https://xyf6qhiwi1.execute-api.us-west-2.amazonaws.com/development/" : "https://wyach4oti8.execute-api.us-west-2.amazonaws.com/production/"

function postData(url, data) {
    return fetch(url, {
        method: "POST",
        mode: "cors",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(data)
    }).then((response) => {
        return response.json()
    })
}

module.exports = @MobxReact.observer class PlayerPickerWidget extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            eventName: "",
            eventStartDate: new Date(),
            eventEndDate: new Date(),
            isCreating: false
        }
    }

    getDateString(date) {
        return date.toISOString().split("T")[0]
    }

    createEvent() {
        this.setState({ isCreating: true })
        let newEventId = uuidv4()
        postData(`${awsPath}setEventSummary/${newEventId}`, {
            eventName: this.state.eventName,
            startDate: this.getDateString(this.state.eventStartDate),
            endDate: this.getDateString(this.state.eventEndDate)
        }).then((response) => {
            console.log(response)

            this.setState({ isCreating: false })
            if (this.props.onCreate !== undefined) {
                this.props.onCreate(newEventId, this.state.eventName)
            }
            alert(`Created event: ${this.state.eventName}`)
        }).catch((error) => {
            console.error(`Error Creating ${this.state.eventName}: ${error}`)

            this.setState({ isCreating: false })
            this.onCancel()
        })
    }

    onStartDateChanged(e) {
        this.state.eventStartDate = new Date(e)
        this.setState(this.state)
    }

    onEndDateChanged(e) {
        this.state.eventEndDate = new Date(e)
        this.setState(this.state)
    }

    onCancel() {
        if (this.props.onCancel !== undefined) {
            this.props.onCancel()
        }
    }

    onEventNameChange(e) {
        this.setState({ eventName: e.target.value })
    }

    render() {
        return (
            <div className="createEventWidget">
                <div className="title">
                    <div>Create Event</div>
                    <button onClick={() => this.onCancel()}>X</button>
                </div>
                <label>Event Name
                    <input type="text" value={this.state.eventName} onChange={(e) => this.onEventNameChange(e)}/>
                </label>
                <label>
                        Start Date:
                    <DatePicker selected={this.state.eventStartDate} onChange={(e) => this.onStartDateChanged(e)}/>
                </label>
                <label>
                    End Date:
                    <DatePicker selected={this.state.eventEndDate} onChange={(e) => this.onEndDateChanged(e)}/>
                </label>
                <button disabled={this.state.isCreating} onClick={() => this.createEvent()}>{this.state.isCreating ? "Creating..." : "Create Event"}</button>
            </div>
        )
    }
}
