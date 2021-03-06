import React, {Component} from 'react';
import moment from "moment";
import createGraph, {removeGraphIfPresent} from "./Graph";
import Dashboard from "./Dashboard";
import {readStockData} from "../../data/dataloader";
import {getFilteredStocksData, getNonMfStockNames, getProfitOrLossPercentagesByDay, readConfigData} from "./Util";

class CompareStocks extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loading: false,
            amountToInvest: null,
            date: moment().subtract(7, "year").subtract(4, "month"),
            stocksData: [],
            stocks: [],
            mfStockNames: [],
            mfStockPercentages: []
        }
    }

    handleAmountInput = (event) => {
        const regExp = /^[0-9\b]+$/;
        if (event.target.value === '' || regExp.test(event.target.value)) {
            this.setState({
                [event.target.name]: event.target.value
            });
        }
    };

    handleDateChange = (date) => {
        this.setState({
            date: date
        });
    };

    componentWillMount() {
        const [mfStockNames, mfStockPercentages] = readConfigData();
        if (mfStockNames !== null && mfStockPercentages !== null && mfStockNames !== undefined && mfStockPercentages !== undefined)
            this.setState({
                mfStockNames: mfStockNames,
                mfStockPercentages: mfStockPercentages
            });
    }

    componentDidMount = async () => {
        const [stocksData, stocks] = await readStockData();
        if (stocksData !== null && stocks !== null && stocks !== undefined && stocksData !== undefined) {
            this.setState({
                stocksData: stocksData,
                stocks: stocks,
                loading: false
            }, this.renderGraph)
        }
    };

    handleSubmit = () => {
        removeGraphIfPresent();
        this.setState({
            loading: true
        }, () => {
            setTimeout(async () => {
                await this.renderGraph();
                this.setState({
                    loading: false
                })
            }, 1000);
        });
    };

    renderGraph = () => {
        if (this.state.date !== null && this.state.amountToInvest !== null && this.state.mfStockNames.length !== 0) {
            const mfStocksData = getFilteredStocksData(this.state.mfStockNames, this.state.stocksData, this.state.date);
            const nonMfStocksNames = getNonMfStockNames(this.state.stocks, this.state.mfStockNames);
            const nonMfStocksData = getFilteredStocksData(nonMfStocksNames, this.state.stocksData, this.state.date);

            const endDate = moment("2018-02-07");
            const startDate = moment(endDate).subtract(parseInt(process.env.REACT_APP_COMPARE_STOCKS_MONTH_STOCKS), "month");
            const mfStockPercentagesByDay = getProfitOrLossPercentagesByDay(this.state.mfStockNames, mfStocksData, startDate, endDate, this.state.date);
            const nonMfStocksPercentagesByDay = getProfitOrLossPercentagesByDay(nonMfStocksNames, nonMfStocksData, startDate, endDate, this.state.date);

            createGraph(mfStockPercentagesByDay, nonMfStocksPercentagesByDay, startDate, endDate);

        }
    };

    render() {
        return (
            <Dashboard
                handleSubmit={this.handleSubmit}
                loading={this.state.loading}
                amountToInvest={this.state.amountToInvest}
                date={this.state.date}
                handleAmountInput={this.handleAmountInput}
                handleDateChange={this.handleDateChange}/>
        )
    }
}

export default CompareStocks;