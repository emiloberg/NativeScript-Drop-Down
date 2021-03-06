/*! *****************************************************************************
Copyright (c) 2015 Tangra Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
***************************************************************************** */

import common = require("./drop-down-common");
import utils = require("utils/utils");
import dependencyObservable = require("ui/core/dependency-observable");
import types = require("utils/types");
import view = require("ui/core/view");
import label = require("ui/label");
import stackLayout = require("ui/layouts/stack-layout");

// merge the exports of the common file with the exports of this file
declare var exports;
require("utils/module-merge").merge(common, exports);

var LABELVIEWID = "spinner-label";

enum RealizedViewType
{
    ItemView
    , DropDownView
}

export class DropDown extends common.DropDown
{
    private _android: android.widget.Spinner
    private _androidViewId: number;
    public _realizedItems = {};

    public _createUI()
    {
        this._android = new android.widget.Spinner(this._context);

        if (!this._androidViewId)
        {
            this._androidViewId = android.view.View.generateViewId();
        }
        this._android.setId(this._androidViewId);

        this.android.setAdapter(new DropDownAdapter(this));

        var that = new WeakRef(this);
        this.android.setOnItemSelectedListener(new android.widget.AdapterView.OnItemSelectedListener(
            {
                onItemSelected:
                function (parent: any, convertView: android.view.View, index: number, id: number)
                {
                    var owner = that.get();

                    owner.selectedIndex = index;
                }
                , onNothingSelected: () => { }
            }));
    }

    get android(): android.widget.Spinner
    {
        return this._android;
    }

    public _onItemsPropertyChanged(data: dependencyObservable.PropertyChangeData)
    {
        if (!this._android
            || !this._android.getAdapter()
            )
        {
            return;
        }
        this._updateSelectedIndexOnItemsPropertyChanged(data.newValue);
        (<DropDownAdapter>this.android.getAdapter()).notifyDataSetChanged();
    }

    public _onDetached(force?: boolean)
    {
        super._onDetached(force);

        // clear the cache
        var keys = Object.keys(this._realizedItems);
        var i;
        var length = keys.length;
        var view: view.View;
        var key;

        for (i = 0; i < length; i++)
        {
            key = keys[i];
            view = this._realizedItems[key];
            view.parent._removeView(view);
            delete this._realizedItems[key];
        }
    }

    public _getRealizedView(convertView: android.view.View, realizedViewType: RealizedViewType): view.View
    {
        if (!convertView)
        {
            var view = new label.Label();
            var layout = new stackLayout.StackLayout()
            var defaultPadding = 4 * utils.layout.getDisplayDensity();

            view.id = LABELVIEWID;
            view.fontSize = 18; // Default font size
            layout.paddingLeft = layout.paddingRight = defaultPadding;
            if (realizedViewType == RealizedViewType.DropDownView)
            {
                layout.paddingTop = layout.paddingBottom = defaultPadding;
            }

            layout.addChild(view);

            return layout;
        }

        return this._realizedItems[convertView.hashCode()];
    }

    public _onSelectedIndexPropertyChanged(data: dependencyObservable.PropertyChangeData)
    {
        super._onSelectedIndexPropertyChanged(data);
        this.android.setSelection(data.newValue);
    }

    private _updateSelectedIndexOnItemsPropertyChanged(newItems)
    {
        var newItemsCount = 0;
        if (newItems && newItems.length)
        {
            newItemsCount = newItems.length;
        }

        if (newItemsCount === 0)
        {
            this.selectedIndex = undefined;
        }
        else if (types.isUndefined(this.selectedIndex)
            || this.selectedIndex >= newItemsCount
            )
        {
            this.selectedIndex = 0;
        }
    }
}

class DropDownAdapter extends android.widget.BaseAdapter
{
    private _dropDown: DropDown;

    constructor(dropDown: DropDown)
    {
        super();

        this._dropDown = dropDown;

        return global.__native(this);
    }

    public getCount()
    {
        return this._dropDown && this._dropDown.items ? this._dropDown.items.length : 0;
    }

    public getItem(i: number)
    {
        if (this._dropDown
            && this._dropDown.items
            && i < this._dropDown.items.length
            )
        {
            return this._dropDown.items.getItem ? this._dropDown.items.getItem(i) : this._dropDown.items[i];
        }

        return null;
    }

    public getItemId(i: number)
    {
        return long(i);
    }

    public hasStableIds(): boolean
    {
        return true;
    }

    public getView(index: number, convertView: android.view.View, parent: android.view.ViewGroup): android.view.View
    {
        return this._generateView(index, convertView, parent, RealizedViewType.ItemView);
    }

    public getDropDownView(index: number, convertView: android.view.View, parent: android.view.ViewGroup): android.view.View
    {
        return this._generateView(index, convertView, parent, RealizedViewType.DropDownView);
    }

    private _generateView(index: number, convertView: android.view.View, parent: android.view.ViewGroup, realizedViewType: RealizedViewType): android.view.View
    {
        if (!this._dropDown)
        {
            return null;
        }

        var view = this._dropDown._getRealizedView(convertView, realizedViewType);

        if (view)
        {
            if (!view.parent)
            {
                this._dropDown._addView(view);
                convertView = view.android;
            }

            view.getViewById<label.Label>(LABELVIEWID).text = this.getItem(index);
            this._dropDown._realizedItems[convertView.hashCode()] = view;
        }

        return convertView;
    }
}