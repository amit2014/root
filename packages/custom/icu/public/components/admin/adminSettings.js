'use strict';

//angular.module('mean.icu.ui.webhook', []);

angular.module('mean.icu.ui.admin', []).controller('adminSettingsController', 
    function($scope, me) {
        $scope.me = me;
        console.log('adminSettings controller')
        
    }
);