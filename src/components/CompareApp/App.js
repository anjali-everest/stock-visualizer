import React, {Component} from 'react';
import "react-dates/initialize";
import "react-dates/lib/css/_datepicker.css";
import "../../styles/styles.css";
import moment from "moment";
import * as d3 from "d3";
import createGraph from "./Graph";
import Dashboard from "./Dashboard";
import {readStockData} from "../StockVisualizer/StockVisualizerUtil";

class App extends Component {
    constructor(props) {
        super(props);
        this.state = {
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
        }, this.renderGraph);
    };

    componentWillMount() {
        this.readConfigData();
    }

    componentDidMount = async () => {
        const [stocksData, stocks] = await readStockData();
        if (stocksData !== null && stocks !== null && stocks !== undefined && stocksData !== undefined) {
            this.setState({
                stocksData: stocksData,
                stocks: stocks
            }, this.renderGraph)
        }
    };

    readConfigData = () => {
        const mfStocks = process.env.REACT_APP_STOCKS_PERCENTAGES.split(",");
        const mfStockNames = [];
        const mfStockPercentages = [];
        mfStocks.map((mfStock) => {
            const stocksValues = mfStock.split(':');
            mfStockNames.push(stocksValues[0].trim());
            mfStockPercentages.push(stocksValues[1].trim());
        });
        this.setState({
            mfStockNames: mfStockNames,
            mfStockPercentages: mfStockPercentages
        });
    };

    renderGraph() {
        if (this.state.date !== null && this.state.amountToInvest !== null && this.state.mfStockNames.length !== 0) {
            const mfStocksData = this.getFilteredStocksData(this.state.mfStockNames);
            const nonMfStocksNames = this.getNonMfStockNames();
            const nonMfStocksData = this.getFilteredStocksData(nonMfStocksNames);

            const endDate = moment("2018-02-07");
            const startDate = moment(endDate).subtract(parseInt(process.env.REACT_APP_COMPARE_STOCKS_MONTH_STOCKS), "month");
            const mfStockPercentagesByDay = this.getPorLPercentagesByDay(this.state.mfStockNames, mfStocksData, startDate, endDate);
            const nonMfStocksPercentagesByDay = this.getPorLPercentagesByDay(nonMfStocksNames, nonMfStocksData, startDate, endDate);

            createGraph(mfStockPercentagesByDay, nonMfStocksPercentagesByDay, startDate, endDate);
        }
    }

    getPorLPercentagesByDay(stocksNames, stocksData, startDate, endDate) {
        const percentagesByDay = new Map();
        let currentDate = Object.assign({}, startDate);
        const boughtPricesForStocks = this.getBoughtPricesPerStock(stocksData);
        while (moment(currentDate).isBefore(moment(endDate))) {
            percentagesByDay.set(moment(currentDate).format("YYYY-MM-DD"), this.getPercentage(currentDate, boughtPricesForStocks, stocksNames, stocksData));
            currentDate = this.getNextDay(currentDate);
        }
        return percentagesByDay;
    }

    getBoughtPricesPerStock(stocksData) {
        const boughtPricesPerStock = new Map();
        Array.from(stocksData.keys()).map((stockName) => {
            boughtPricesPerStock.set(stockName, this.getPrice(this.state.date, stocksData.get(stockName)))
        });
        return boughtPricesPerStock;
    }

    getPrice(date, stockData) {
        let presentDay = date;
        let boughtPrice = null;
        const dateFormat = d3.timeParse("%Y-%m-%d");
        do {
            const nextDay = this.getNextDay(presentDay).format("YYYY-MM-DD");
            boughtPrice = stockData.get(nextDay);
            presentDay = moment(dateFormat(nextDay));
        } while (boughtPrice === undefined || boughtPrice === "" || boughtPrice === null);
        return boughtPrice;
    }

    getNextDay = (date) => {
        const day = Object.assign({}, date);
        return moment(day).add(1, "days");
    };

    getPercentage(date, boughtPrices, stockNames, stocksData) {
        let percentageSum = 0;
        const formattedDate = moment(date);
        stockNames.map((stock) => {
            const boughtPriceOfStock = boughtPrices.get(stock);
            const openPrice = this.getPrice(formattedDate, stocksData.get(stock));
            const percentageOfStock = ((openPrice - boughtPriceOfStock) / boughtPriceOfStock) * 100;
            if (isNaN(percentageOfStock))
                return 0;
            percentageSum = percentageSum + percentageOfStock;
        });

        return percentageSum / stockNames.length;
    }

    render() {
        return (
            <Dashboard amountToInvest={this.state.amountToInvest} date={this.state.date}
                       handleAmountInput={this.handleAmountInput} handleDateChange={this.handleDateChange}/>
        )
    }

    getFilteredStocksData = (stocksNames) => {
        const filteredStocksMap = new Map();
        stocksNames.map((stockName) => {
            filteredStocksMap.set(stockName, this.getOpenPricesByDay(stockName));
        });
        return filteredStocksMap;
    };

    getOpenPricesByDay(stockName) {
        const openPriceByDay = new Map();
        this.state.stocksData.map((stock) => {
            if (stock.Name === stockName && this.getFormattedDate(stock.date) > this.state.date) {
                openPriceByDay.set(stock.date, stock.open);
            }
        });
        return openPriceByDay;
    }

    getFormattedDate(date) {
        const dateFormat = d3.timeParse("%Y-%m-%d");
        if (typeof date === "string")
            return dateFormat(date);
        return date;
    }

    getNonMfStockNames() {
        return this.state.stocks.filter((stockName) => {
            return !this.state.mfStockNames.includes(stockName);
        })
    }
}

export default App;