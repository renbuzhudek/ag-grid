import React, {Component, createRef} from 'react';

const KEY_BACKSPACE = 8;
const KEY_DELETE = 46;

export default class MySimpleEditor extends Component {
    constructor(props) {
        super(props);

        this.inputRef = createRef();

        this.state = {
            value: this.getInitialValue(props)
        };
    }

    componentDidMount() {
        setTimeout(() => this.inputRef.current.focus())
    }

    getInitialValue(props) {
        let startValue = props.value;

        const keyPressBackspaceOrDelete = props.keyPress === KEY_BACKSPACE || props.keyPress === KEY_DELETE;
        if (keyPressBackspaceOrDelete) {
            startValue = '';
        } else if (props.charPress) {
            startValue = props.charPress;
        }

        if (startValue !== null && startValue !== undefined) {
            return startValue;
        }

        return '';
    }

    getValue() {
        return this.state.value;
    }

    myCustomFunction() {
        return {
            rowIndex: this.props.rowIndex,
            colId: this.props.column.getId()
        };
    }

    render() {
        return (
            <input value={this.state.value} ref={this.inputRef}
                   onChange={event => this.setState({value: event.target.value})}/>
        );
    }
}
