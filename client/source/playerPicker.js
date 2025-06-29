const React = require("react")
const MobxReact = require("mobx-react")
const Dropdown = require("react-dropdown").default
const StringSimilarity = require("string-similarity")

const MainStore = require("./mainStore.js")

require("react-dropdown/style.css")
require("./playerpicker.less")

const awsPath = __STAGE__ === "DEVELOPMENT" ? "https://tkhmiv70u9.execute-api.us-west-2.amazonaws.com/development/" : "https://4wnda3jb78.execute-api.us-west-2.amazonaws.com/production/"
const countryCodes = [ "AFG", "ALA", "ALB", "DZA", "ASM", "AND", "AGO", "AIA", "ATA", "ATG", "ARG", "ARM", "ABW", "AUS", "AUT", "AZE", "BHS", "BHR", "BGD", "BRB", "BLR", "BEL", "BLZ", "BEN", "BMU", "BTN", "BOL", "BES", "BIH", "BWA", "BVT", "BRA", "IOT", "BRN", "BGR", "BFA", "BDI", "KHM", "CMR", "CAN", "CPV", "CYM", "CAF", "TCD", "CHL", "CHN", "CXR", "CCK", "COL", "COM", "COG", "COD", "COK", "CRI", "CIV", "HRV", "CUB", "CUW", "CYP", "CZE", "DNK", "DJI", "DMA", "DOM", "ECU", "EGY", "SLV", "GNQ", "ERI", "EST", "ETH", "FLK", "FRO", "FJI", "FIN", "FRA", "GUF", "PYF", "ATF", "GAB", "GMB", "GEO", "DEU", "GHA", "GIB", "GRC", "GRL", "GRD", "GLP", "GUM", "GTM", "GGY", "GIN", "GNB", "GUY", "HTI", "HMD", "VAT", "HND", "HKG", "HUN", "ISL", "IND", "IDN", "IRN", "IRQ", "IRL", "IMN", "ISR", "ITA", "JAM", "JPN", "JEY", "JOR", "KAZ", "KEN", "KIR", "PRK", "KOR", "XKX", "KWT", "KGZ", "LAO", "LVA", "LBN", "LSO", "LBR", "LBY", "LIE", "LTU", "LUX", "MAC", "MKD", "MDG", "MWI", "MYS", "MDV", "MLI", "MLT", "MHL", "MTQ", "MRT", "MUS", "MYT", "MEX", "FSM", "MDA", "MCO", "MNG", "MNE", "MSR", "MAR", "MOZ", "MMR", "NAM", "NRU", "NPL", "NLD", "NCL", "NZL", "NIC", "NER", "NGA", "NIU", "NFK", "MNP", "NOR", "OMN", "PAK", "PLW", "PSE", "PAN", "PNG", "PRY", "PER", "PHL", "PCN", "POL", "PRT", "PRI", "QAT", "SRB", "REU", "ROU", "RUS", "RWA", "BLM", "SHN", "KNA", "LCA", "MAF", "SPM", "VCT", "WSM", "SMR", "STP", "SAU", "SEN", "SYC", "SLE", "SGP", "SXM", "SVK", "SVN", "SLB", "SOM", "ZAF", "SGS", "SSD", "ESP", "LKA", "SDN", "SUR", "SJM", "SWZ", "SWE", "CHE", "SYR", "TWN", "TJK", "TZA", "THA", "TLS", "TGO", "TKL", "TON", "TTO", "TUN", "TUR", "XTX", "TKM", "TCA", "TUV", "UGA", "UKR", "ARE", "GBR", "USA", "UMI", "URY", "UZB", "VUT", "VEN", "VNM", "VGB", "VIR", "WLF", "ESH", "YEM", "ZMB", "ZWE" ]


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

let cachedPlayers = []

module.exports = @MobxReact.observer class PlayerPickerWidget extends React.Component {
    constructor(props) {
        super(props)

        this.state = {
            searchText: "",
            selectedResultIndex: undefined,
            selectedPlayerKey: undefined,
            selectedPlayerFirstName: "",
            selectedPlayerLastName: "",
            selectedPlayerFpaNumber: 0,
            selectedPlayerCountry: "",
            selectedPlayerGender: "",
            searchResults: [],
            isNewPlayerSelected: false,
            inited: false
        }
    }

    getSimilarPlayersByName(name) {
        let bestNames = []
        let searchName = name.toLowerCase()
        const maxCount = 10
        for (let cachedPlayer of cachedPlayers) {
            let similar = StringSimilarity.compareTwoStrings(searchName, cachedPlayer.firstName)
            similar = Math.max(similar, StringSimilarity.compareTwoStrings(searchName, cachedPlayer.lastName))
            similar = Math.max(similar, StringSimilarity.compareTwoStrings(searchName, cachedPlayer.fullName))
            if (similar > .4) {
                if (bestNames.length < maxCount || similar > bestNames[maxCount - 1].score) {
                    let index = bestNames.findIndex((data) => data.score < similar)
                    bestNames.splice(index >= 0 ? index : bestNames.length, 0, {
                        key: cachedPlayer.key,
                        score: similar
                    })

                    if (bestNames.length > maxCount) {
                        bestNames.pop()
                    }
                }
            }
        }

        return bestNames.map((data) => this.props.playerData[data.key])
    }

    onSearchTextChange(e) {
        if (!this.state.inited) {
            cachedPlayers = []
            for (let playerKey in this.props.playerData) {
                let player = this.props.playerData[playerKey]
                cachedPlayers.push({
                    key: player.key,
                    firstName: (player.firstName || "").toLowerCase(),
                    lastName: (player.lastName || "").toLowerCase(),
                    fullName: `${(player.firstName || "").toLowerCase()} ${(player.lastName || "").toLowerCase()}`
                })
            }

            this.state.inited = true
        }

        this.state.searchResults = []
        this.state.searchText = e.target.value
        this.state.selectedResultIndex = undefined
        this.state.isNewPlayerSelected = false

        if (e.target.value !== "") {
            this.fillSearchResults()
        }

        this.setState(this.state)
    }

    fillSearchResults() {
        this.state.searchResults = []
        if (this.state.searchText !== undefined && this.state.searchText.length > 0) {
            this.state.searchResults = this.getSimilarPlayersByName(this.state.searchText)

            this.setState(this.state)
        }
    }

    getSearchWidget() {
        return (
            <div className="searchWidget">
                <label>Search:</label>
                <input type="text" autoFocus placeholder="Player Name" value={this.state.searchText} onChange={(e) => this.onSearchTextChange(e)} />
            </div>
        )
    }

    onPlayerSearchResultClick(index) {
        this.state.isNewPlayerSelected = false
        this.state.selectedResultIndex = index

        let playerData = this.state.searchResults[index]
        if (playerData.aliasKey !== undefined && playerData.aliasKey.length > 0) {
            playerData = this.findOriginalPlayerDataFromAlias(playerData.aliasKey)
        }
        this.state.selectedPlayerKey = playerData.key
        this.state.selectedPlayerFirstName = playerData.firstName || ""
        this.state.selectedPlayerLastName = playerData.lastName || ""
        this.state.selectedPlayerFpaNumber = playerData.membership || 0
        this.state.selectedPlayerCountry = playerData.country || ""
        this.state.selectedPlayerGender = playerData.gender || ""

        this.setState(this.state)
    }

    onNewPlayerClick() {
        this.state.isNewPlayerSelected = true
        this.state.selectedResultIndex = -1

        this.state.selectedPlayerKey = undefined
        this.state.selectedPlayerFirstName = ""
        this.state.selectedPlayerLastName = ""
        this.state.selectedPlayerFpaNumber = 0
        this.state.selectedPlayerCountry = ""
        this.state.selectedPlayerGender = ""

        this.setState(this.state)
    }

    getSearchResultsWidget() {
        let results = this.state.searchResults.map((data, index) => {
            let className = "playerSearchResult"
            if (index === this.state.selectedResultIndex) {
                className += " selected"
            }
            let aliasTag = data.aliasKey !== undefined ? " (Alias)" : ""
            return (
                <div key={data.key} className={className} onClick={() => this.onPlayerSearchResultClick(index)}>
                    {`${data.firstName} ${data.lastName}${aliasTag}`}
                </div>
            )
        })
        if (results.length === 0) {
            if (this.state.searchText.length < 2) {
                results.push(<div key="search">Search above for Players by Name</div>)
            } else {
                results.push(<div key="no">No Players Found</div>)
            }
        }
        let newPlayerClassname = `playerSearchResult newPlayer ${this.state.isNewPlayerSelected ? "selected" : ""}`
        results.push(
            <div key="add" className={newPlayerClassname} onClick={() => this.onNewPlayerClick()}>Add New Player</div>
        )
        return (
            <div className="searchResults">
                <div className="headerText">Search Results</div>
                {results}
            </div>
        )
    }

    getSelectedResultWidget() {
        let details = []
        if (this.state.selectedResultIndex === undefined && this.state.searchResults.length > 0) {
            details.push(<div key="search">Select Name in Search Results</div>)
        } else if (this.state.selectedResultIndex !== undefined) {
            details.push(
                <div key="firstName" className="detail">
                    <label>First Name:</label>
                    <input type="text" value={this.state.selectedPlayerFirstName} readOnly={!this.state.isNewPlayerSelected} onChange={(e) => {
                        this.state.selectedPlayerFirstName = e.target.value
                        this.setState(this.state)
                    }}/>
                </div>
            )
            details.push(
                <div key="lastName" className="detail">
                    <label>Last Name:</label>
                    <input type="text" value={this.state.selectedPlayerLastName} readOnly={!this.state.isNewPlayerSelected} onChange={(e) => {
                        this.state.selectedPlayerLastName = e.target.value
                        this.setState(this.state)
                    }}/>
                </div>
            )
            details.push(
                <div key="fpaNumber" className="detail">
                    <div>FPA #:</div>
                    <input type="text" value={this.state.selectedPlayerFpaNumber} readOnly={!this.state.isNewPlayerSelected} onChange={(e) => {
                        this.state.selectedPlayerFpaNumber = parseInt(e.target.value, 10)
                        this.setState(this.state)
                    }}/>
                </div>
            )
            details.push(
                <div key="country" className="detail">
                    <label>Country:</label>
                    <Dropdown options={countryCodes} value={this.state.selectedPlayerCountry} disabled={!this.state.isNewPlayerSelected} placeholder="Select Country" onChange={(e) => {
                        this.state.selectedPlayerCountry = e.value
                        this.setState(this.state)
                    }}/>
                </div>
            )
            details.push(
                <div key="gender" className="detail">
                    <label>Gender:</label>
                    <Dropdown options={[ "M", "F", "X" ]} value={this.state.selectedPlayerGender} disabled={!this.state.isNewPlayerSelected} placeholder="Select Gender" onChange={(e) => {
                        this.state.selectedPlayerGender = e.value
                        this.setState(this.state)
                    }}/>
                </div>
            )

            details.push(<button key="update" onClick={() => this.onSelectPlayer()}>{this.state.isNewPlayerSelected ? "Create and Select Player" : "Select Player"}</button>)
        }

        return (
            <div className="selectedDetails">
                <div className="headerText">Player Details</div>
                {details}
            </div>
        )
    }

    onSelectPlayer() {
        let onSelectCallback = this.props.onSelect
        if (onSelectCallback !== undefined) {
            if (this.state.isNewPlayerSelected) {
                this.addPlayer().then((addedPlayerKey) => {
                    console.log("added key", addedPlayerKey)
                    onSelectCallback(addedPlayerKey, true)
                })
            } else {
                onSelectCallback(this.state.selectedPlayerKey, false)
            }
        }
    }

    getResultsWidget() {
        return (
            <div className="resultsWidget">
                {this.getSearchResultsWidget()}
                {this.getSelectedResultWidget()}
            </div>
        )
    }

    addPlayer() {
        return postData(`${awsPath}addPlayer/${this.state.selectedPlayerFirstName.trim()}/lastName/${this.state.selectedPlayerLastName.trim()}`, {
            membership: this.state.selectedPlayerFpaNumber,
            country: this.state.selectedPlayerCountry,
            gender: this.state.selectedPlayerGender
        }).then((response) => {
            console.log(response)

            return response.addedPlayer.key
        }).catch((error) => {
            console.error(error)
        })
    }

    findOriginalPlayerDataFromAlias(aliasKey) {
        let playerData = MainStore.playerData[aliasKey]
        if (playerData === undefined) {
            return undefined
        }

        for (let i = 0; i < 100; ++i) {
            if (playerData.aliasKey === undefined || playerData.aliasKey.length === 0) {
                return playerData
            }

            playerData = MainStore.playerData[playerData.aliasKey]
        }

        return undefined
    }

    onCancel() {
        this.state.isNewPlayerSelected = false
        this.state.selectedPlayerKey = undefined

        this.onSelectPlayer()

        this.setState(this.state)
    }

    render() {
        return (
            <div className="playerPickerWidget">
                <div className="title">
                    <div>Player Picker</div>
                    <button onClick={() => this.onCancel()}>X</button>
                </div>
                {this.getSearchWidget()}
                {this.getResultsWidget()}
            </div>
        )
    }
}
