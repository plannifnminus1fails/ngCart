'use strict';


angular.module('ngCart', ['ngCart.directives'])

    .config([function () {

    }])

    .provider('$ngCart', function () {
        this.$get = function () {
        };
    })

    .run(['$rootScope', 'ngCart','ngCartItem', 'store', function ($rootScope, ngCart, ngCartItem, store) {

        $rootScope.$on('ngCart:change', function(){
            ngCart.$save();
        });

        // if (angular.isObject(store.get('cart'))) {
        //     ngCart.$restore(store.get('cart'));

        // } else {
        //     ngCart.init();
        // }

        store.get('cart',function(cart){
            if (angular.isObject(cart)) {
                ngCart.$restore(cart);
            } else {
                ngCart.init();
            }
        });

    }])

    .service('ngCart', ['$rootScope', 'ngCartItem', 'store', 'Global', '$http', function ($rootScope, ngCartItem, store, Global, $http) {

        this.init = function(){
            this.$cart = {
                shipping : null,
                taxRate : null,
                tax : null,
                items : []
            };
        };

        this.addItem = function (id, name, price, quantity, data) {

            var inCart = this.getItemById(id);

            if (typeof inCart === 'object'){
                //Update quantity of an item if it's already in the cart
                inCart.setQuantity(quantity, false);
            } else {
                var newItem = new ngCartItem(id, name, price, quantity, data);
                this.$cart.items.push(newItem);
                $rootScope.$broadcast('ngCart:itemAdded', newItem);
            }

            // $rootScope.$broadcast('ngCart:change', {});
        };

        this.getItemById = function (itemId) {
            var items = this.getCart().items;
            var build = false;

            angular.forEach(items, function (item) {
                if  (item.getId() === itemId) {
                    build = item;
                }
            });
            return build;
        };

        this.setShipping = function(shipping){
            this.$cart.shipping = shipping;
            return this.getShipping();
        };

        this.getShipping = function(){
            if (this.getCart().items.length == 0) return 0;
            return  this.getCart().shipping;
        };

        this.setTaxRate = function(taxRate){
            this.$cart.taxRate = +parseFloat(taxRate).toFixed(2);
            return this.getTaxRate();
        };

        this.getTaxRate = function(){
            return this.$cart.taxRate
        };

        this.getTax = function(){
            return +parseFloat(((this.getSubTotal()/100) * this.getCart().taxRate )).toFixed(2);
        };

        this.setCart = function (cart) {
            this.$cart = cart;
            return this.getCart();
        };

        this.getCart = function(){
            return this.$cart;
        };

        this.getItems = function(){
            return this.getCart().items;
        };

        this.totalItems = function () {
            return this.getCart().items.length;
        };

        this.getSubTotal = function(){
            var total = 0;
            angular.forEach(this.getCart().items, function (item) {
                total += item.getTotal();
            });
            return total;
        };

        this.totalCost= function () {
            return +parseFloat(this.getSubTotal() + this.getShipping() + this.getTax()).toFixed(2);
        };

        this.removeItem = function (index) {
            this.$cart.items.splice(index, 1);
            $rootScope.$broadcast('ngCart:itemRemoved', {});
            $rootScope.$broadcast('ngCart:change', {});

        };

        this.removeItemById = function (id) {
            var cart = this.getCart();
            angular.forEach(cart.items, function (item, index) {
                if  (item.getId() === id) {
                    cart.items.splice(index, 1);
                }
            });
            this.setCart(cart);
            $rootScope.$broadcast('ngCart:itemRemoved', {});
            $rootScope.$broadcast('ngCart:change', {});
        };

        this.empty = function () {
            this.$cart.items = [];
            //localStorage.removeItem('cart');
                if (Global.user._id) {
                    $http.get('carts/' + Global.user._id)
                    .success(function(response) {
                        $http.delete('carts/' + Global.user._id)
                        .success(function(response) {
                                return response;
                        });
                    });
                }
        };

        this.toObject = function() {

            if (this.getItems().length === 0) return false;

            var items = [];
            angular.forEach(this.getItems(), function(item){
                items.push (item.toObject());
            });

            return {
                shipping: this.getShipping(),
                tax: this.getTax(),
                taxRate: this.getTaxRate(),
                subTotal: this.getSubTotal(),
                totalCost: this.totalCost(),
                items:items
            }
        };


        this.$restore = function(storedCart){
            var _self = this;
            _self.init();
            _self.$cart.shipping = storedCart.shipping;
            _self.$cart.tax = storedCart.tax;
            angular.forEach(storedCart.items, function (item) {
                _self.$cart.items.push(new ngCartItem(item._id,  item._name, item._price, item._quantity, item._data));
            });
            //this.$save();
        };

        this.$save = function () {
            // return store.set('cart', JSON.stringify(this.getCart()));
            return store.set('cart', this.getCart());
        }

    }])

    .factory('ngCartItem', ['$rootScope', function ($rootScope) {

        var item = function (id, name, price, quantity, data) {
            this.setId(id);
            this.setName(name);
            this.setPrice(price);
            this.setQuantity(quantity);
            this.setData(data);
        };


        item.prototype.setId = function(id){
            if (id)  this._id = id;
            else {
                console.error('An ID must be provided');
            }
        };

        item.prototype.getId = function(){
            return this._id;
        };


        item.prototype.setName = function(name){
            if (name)  this._name = name;
            else {
                console.error('A name must be provided');
            }
        };
        item.prototype.getName = function(){
            return this._name;
        };

        item.prototype.setPrice = function(price){
            var priceFloat = parseFloat(price);
            if (priceFloat) {
                if (priceFloat <= 0) {
                    console.error('A price must be over 0');
                } else {
                    this._price = (priceFloat);
                }
            } else {
                console.error('A price must be provided');
            }
        };
        item.prototype.getPrice = function(){
            return this._price;
        };


        item.prototype.setQuantity = function(quantity, relative){


            var quantityInt = parseInt(quantity);
            if (quantityInt % 1 === 0){
                if (relative === true){
                    this._quantity  += quantityInt;
                } else {
                    this._quantity = quantityInt;
                }
                if (this._quantity < 1) this._quantity = 1;

            } else {
                this._quantity = 1;
                console.info('Quantity must be an integer and was defaulted to 1');
            }
            $rootScope.$broadcast('ngCart:change', {});

        };

        item.prototype.getQuantity = function(){
            return this._quantity;
        };

        item.prototype.setData = function(data){
            if (data) this._data = data;
        };

        item.prototype.getData = function(){
            if (this._data) return this._data;
            else console.info('This item has no data');
        };

        item.prototype.getTotal = function(){
            return +parseFloat(this.getQuantity() * this.getPrice()).toFixed(2);
        };

        item.prototype.toObject = function() {
            return {
                id: this.getId(),
                name: this.getName(),
                price: this.getPrice(),
                quantity: this.getQuantity(),
                data: this.getData(),
                total: this.getTotal()
            }
        };

        return item;

    }])

    .service('store', ['$window', 'Global', '$http', function ($window, Global, $http) {

        return {

            // get: function (key) {
                // if ($window.localStorage [key]) {
                //     var cart = angular.fromJson($window.localStorage [key]);
                //     return JSON.parse(cart);
                // }
            //     return false;

            // },

            // get: function (key, callback) {
            //     var response;
            //     if ($window.localStorage [key]) {
            //         var cart = angular.fromJson($window.localStorage [key]);
            //         response = JSON.parse(cart);
            //     }
            //     if(typeof callback == "function"){
            //         callback(response);
            //     } else {
            //         return response;
            //     }
            //     return false;

            // },

            get: function (key, callback) {
                var response;
                if (Global.user._id) {

                    $http.get('carts/' + Global.user._id)
                    .success(function(response) {
                        if(typeof callback == "function"){
                            callback(response);
                        } else {
                            return response;
                        }

                    }).error(function(){
                        if(typeof callback == "function"){
                            callback(response);
                        }

                        return false;
                    });
                } else {
                        if(typeof callback == "function"){
                            callback(response);
                        }

                        return false;
                }



            },
            set: function (key, val) {

                // if (val === undefined) {
                //     $window.localStorage .removeItem(key);
                // } else {
                //     $window.localStorage [key] = angular.toJson(val);
                // }
                // return $window.localStorage [key];

                if (val === undefined) {
                    return false;
                } else {


                if (Global.user._id) {
                    $http.get('carts/' + Global.user._id)
                    .success(function(response) {
                        $http.put('carts/' + Global.user._id, val)
                        .success(function(response) {
                                return response;
                        });
                    }).error(function(){
                        $http.post('carts', val)
                        .success(function(response) {
                                return response;
                        });
                    });



                }

                }
                return false;
            }
        }
    }])

    .controller('CartController',['$scope', 'ngCart', function($scope, ngCart) {
        $scope.ngCart = ngCart;
    }])

    .value('version', '0.0.1-rc.2');
