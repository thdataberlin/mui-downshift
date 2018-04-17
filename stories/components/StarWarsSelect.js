import React, { Component } from 'react';
import { all as starwarsNames } from 'starwars-names';
import MuiDownshift from '../../src';

const items = starwarsNames.map((label, value) => ({ label, value }));

export default class StarWarsSelect extends Component {
  render() {
    return (
      <MuiDownshift
        items={items}
        onStateChange={this.handleStateChange}
        // keyMapper={rowIndex => filteredItems[rowIndex] && filteredItems[rowIndex].label}
        {...this.props}
      />
    );
  }
}
