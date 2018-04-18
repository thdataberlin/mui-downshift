import React, { Component } from 'react';
import { List as VirtualList, InfiniteLoader, AutoSizer, CellMeasurer, CellMeasurerCache } from 'react-virtualized';
import { Popper } from 'react-popper';
import classnames from 'classnames';
import Portal from 'material-ui/Portal';
import Paper from 'material-ui/Paper';
import Input from 'material-ui/Input';
import { withStyles } from 'material-ui/styles';
import zIndex from 'material-ui/styles/zIndex';

const ESCAPE_KEY = 27;

const styles = theme => ({
  keyboardFocused: {
    backgroundColor: theme.palette.divider,
  },
});

function getRowCount(items, includeFooter) {
  return (items ? items.length : 0) + (includeFooter ? 1 : 0);
}

function getMenuHeight(rowHeight, items, menuItemCount, showEmpty, includeFooter) {
  const rowCount = getRowCount(items, includeFooter);
  if (rowCount) {
    const visibleCount = Math.min(rowCount, menuItemCount); // Maximum items before scrolling
    let height = 0;
    for (let i = 0; i < visibleCount; i++) {
      height += typeof rowHeight === 'function' ? rowHeight({ index: i }) : rowHeight;
    }
    return height;
  } else if (showEmpty) {
    // Return the height of a single item
    return typeof rowHeight === 'function' ? rowHeight({ index: 0 }) : rowHeight;
  }
  return 0;
}

class MuiVirtualList extends Component {
  cache = new CellMeasurerCache({
    fixedWidth: true,
    defaultHeight: 48,
    keyMapper: this.props.getListItemKey,
  });

  componentWillReceiveProps(nextProps) {
    if (this.props.getListItemKey !== nextProps.getListItemKey) {
      this.cache._keyMapper = nextProps.getListItemKey;
    }

    if (this.props.width !== nextProps.width) {
      // Need to recalculate all heights since new widths
      this.cache.clearAll();
      this.list.recomputeRowHeights();
    }

    if (this.props.items !== nextProps.items) {
      if (!this.props.getListItemKey) {
        // Only need to recalculate heights if no getListItemKey is defined as CellMeasureCache.defaultKeyMapper only uses indexes for keys (and new items at the same index might have different heights)
        this.cache.clearAll();
      }

      this.list.recomputeRowHeights();
    }
  }

  render() {
    const {
      items,
      width,
      menuItemCount,
      menuHeight,
      getListItem,
      showEmpty,
      includeFooter,
      getVirtualListProps,
      getListItemKey,
      onRowsRendered,
      registerChild,
      downshiftProps,
      classes,
    } = this.props;

    const virtualListProps = getVirtualListProps && getVirtualListProps({ downshiftProps });
    const rowHeight =
      virtualListProps && virtualListProps.rowHeight ? virtualListProps.rowHeight : this.cache.rowHeight;
    const useCellMeasurer = !(virtualListProps && virtualListProps.rowHeight);

    return (
      <VirtualList
        width={width}
        {...downshiftProps.highlightedIndex != null && { scrollToIndex: downshiftProps.highlightedIndex }}
        height={menuHeight || getMenuHeight(rowHeight, items, menuItemCount, showEmpty, includeFooter)}
        rowCount={getRowCount(items, includeFooter)}
        rowHeight={rowHeight}
        rowRenderer={({ index, style, parent, key }) => {
          const item = items ? items[index] : null;
          const isHighlighted = downshiftProps.highlightedIndex === index;
          const className = classnames({ [classes.keyboardFocused]: isHighlighted });
          // Convenience helper to simplify typical usage
          const getItemProps = props =>
            downshiftProps.getItemProps({
              item,
              index,
              className,
              ...props,
            });
          const listItem = getListItem({
            getItemProps,
            item,
            index,
            downshiftProps,
            style,
          });

          const _key = getListItemKey ? getListItemKey(index) : key;

          if (useCellMeasurer) {
            return (
              <CellMeasurer
                cache={this.cache}
                columnIndex={0}
                rowIndex={index}
                parent={parent}
                key={_key}
                width={width}
              >
                <div style={style}>{listItem}</div>
              </CellMeasurer>
            );
          }
          return (
            <div style={style} key={key}>
              {listItem}
            </div>
          );
        }}
        noRowsRenderer={() => {
          // TODO: Support non-default (48) row height.  Either figure out how to use CellMeasurer (initial attempt failed) or allow passing an explicit height.  This might be  fixed now that the cache is cleared when `items` are changed
          const index = 0;
          const item = null;
          const isHighlighted = downshiftProps.highlightedIndex === index;
          const className = classnames({ [classes.keyboardFocused]: isHighlighted });
          // Convenience helper to simplify typical usage
          const getItemProps = props =>
            downshiftProps.getItemProps({
              item,
              index,
              className,
              ...props,
            });
          return getListItem({
            getItemProps,
            item,
            index,
            downshiftProps,
          });
        }}
        onRowsRendered={onRowsRendered}
        {...useCellMeasurer && { deferredMeasurementCache: this.cache }}
        ref={el => {
          this.list = el;
          if (registerChild) {
            registerChild(el);
          }
        }}
        {...virtualListProps}
      />
    );
  }
}

class Menu extends Component {
  componentDidMount() {
    this.resetSearchFilter();
  }

  resetSearchFilter() {
    const { onSearchFilterChange } = this.props;
    onSearchFilterChange('');
  }

  render() {
    const { getInfiniteLoaderProps, onSearchFilterChange, ...props } = this.props;
    return (
      <AutoSizer>
        {({ width }) => (
          <Portal>
            <Popper placement="bottom-start" style={{ zIndex: zIndex.modal }} onMouseUp={e => e.stopPropagation()}>
              <Paper style={{ width }}>
                {getInfiniteLoaderProps ? (
                  <InfiniteLoader {...getInfiniteLoaderProps({ downshiftProps: props.downshiftProps })}>
                    {({ onRowsRendered, registerChild }) => (
                      <MuiVirtualList
                        {...props}
                        width={width}
                        onRowsRendered={onRowsRendered}
                        registerChild={registerChild}
                      />
                    )}
                  </InfiniteLoader>
                ) : (
                  <React.Fragment>
                    <Input
                      placeholder="Search"
                      onChange={event => {
                        onSearchFilterChange(event.target.value);
                      }}
                      margin="dense"
                      autoFocus
                      style={{ width: width - 48, paddingLeft: 24, paddingRight: 24 }}
                      onKeyDown={event => {
                        // Escape key support
                        if (event.keyCode === ESCAPE_KEY) {
                          // Hide the menu
                          props.downshiftProps.reset();
                        }
                      }}
                    />
                    <MuiVirtualList {...props} width={width} />
                  </React.Fragment>
                )}
              </Paper>
            </Popper>
          </Portal>
        )}
      </AutoSizer>
    );
  }
}

Menu.defaultProps = {
  onRef: () => {},
};

export default withStyles(styles)(Menu);
