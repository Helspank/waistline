/*
  Copyright 2021 David Healey

  This file is part of Waistline.

  Waistline is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  Waistline is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with app.  If not, see <http://www.gnu.org/licenses/>.
*/

app.RecipeEditor = {

  recipe: {},
  el: {},

  init: async function(context) {
    app.RecipeEditor.getComponents();

    if (context) {

      // From recipe list
      if (context.recipe) {
        app.RecipeEditor.recipe = context.recipe;
        app.RecipeEditor.populateInputs(context.recipe);
      }

      app.FoodsMealsRecipes.populateCategoriesField(app.RecipeEditor.el.categories, app.RecipeEditor.recipe, true, true);

      // From food list
      if (context.items)
        app.RecipeEditor.addItems(context.items);

      // From recipe editor
      if (context.item)
        app.RecipeEditor.replaceListItem(context.item);

      app.RecipeEditor.renderNutrition();
      await app.RecipeEditor.renderItems();
    }

    app.RecipeEditor.setRequiredFieldErrorMessage();
    app.RecipeEditor.bindUIActions();
    app.RecipeEditor.setComponentVisibility();
  },

  getComponents: function() {
    app.RecipeEditor.el.submit = document.querySelector(".page[data-name='recipe-editor'] #submit");
    app.RecipeEditor.el.categoriesContainer = document.querySelector(".page[data-name='recipe-editor'] #categories-container");
    app.RecipeEditor.el.categories = document.querySelector(".page[data-name='recipe-editor'] #categories");
    app.RecipeEditor.el.nameInput = document.querySelector(".page[data-name='recipe-editor'] #name");
    app.RecipeEditor.el.foodlist = document.querySelector(".page[data-name='recipe-editor'] #recipe-food-list");
    app.RecipeEditor.el.add = document.querySelector(".page[data-name='recipe-editor'] #add-food");
    app.RecipeEditor.el.nutrition = document.querySelector(".page[data-name='recipe-editor'] #nutrition");
    app.RecipeEditor.el.nutritionButton = document.querySelector(".page[data-name='recipe-editor'] #nutrition-button");
  },

  setComponentVisibility: function() {
    app.FoodsMealsRecipes.setCategoriesVisibility(app.RecipeEditor.el.categoriesContainer);
  },

  bindUIActions: function() {

    // Submit
    if (!app.RecipeEditor.el.submit.hasClickEvent) {
      app.RecipeEditor.el.submit.addEventListener("click", (e) => {
        app.RecipeEditor.save();
      });
      app.RecipeEditor.el.submit.hasClickEvent = true;
    }

    // Add food button
    if (!app.RecipeEditor.el.add.hasClickEvent) {
      app.RecipeEditor.el.add.addEventListener("click", (e) => {
        app.data.context = {
          origin: "./recipe-editor/",
          recipe: app.RecipeEditor.recipe
        };

        app.f7.views.main.router.navigate("/foods-meals-recipes/", {
          context: app.data.context
        });
      });
      app.RecipeEditor.el.add.hasClickEvent = true;
    }

    // Nutrition fields visibility toggle button
    if (!app.RecipeEditor.el.nutritionButton.hasClickEvent) {
      app.RecipeEditor.el.nutritionButton.addEventListener("click", async (e) => {
        app.FoodsMealsRecipes.toggleNutritionFieldsVisibility(app.RecipeEditor.el.nutrition, app.RecipeEditor.el.nutritionButton);
      });
      app.RecipeEditor.el.nutritionButton.hasClickEvent = true;
    }
  },

  setRequiredFieldErrorMessage: function() {
    const error_message = app.strings["food-editor"]["required-field-message"] || "Please fill out this field.";
    let inputs = Array.from(document.getElementsByTagName("input"));
    inputs.forEach((x) => {
      if (x.hasAttribute("required") && x.hasAttribute("validate")) {
        x.setAttribute("data-error-message", error_message);
      }
    });
  },

  populateInputs: function(recipe) {
    let inputs = document.querySelectorAll(".page[data-name='recipe-editor'] input, .page[data-name='recipe-editor'] textarea");

    inputs.forEach((x) => {
      if (recipe[x.name] !== undefined)
        x.value = unescape(recipe[x.name]);
    });
  },

  addItems: function(data) {
    let result = app.RecipeEditor.recipe.items;

    data.forEach((x) => {
      let item = app.FoodsMealsRecipes.flattenItem(x);
      result.push(item);
    });
    app.RecipeEditor.recipe.items = result;
  },

  removeItem: function(item, li) {
    let title = app.strings.dialogs["delete-title"] || "Delete Entry";
    let text = app.strings.dialogs["confirm-delete"] || "Are you sure you want to delete this?";

    let div = document.createElement("div");
    div.className = "dialog-text";
    div.innerText = text;

    let dialog = app.f7.dialog.create({
      title: title,
      content: div.outerHTML,
      buttons: [{
          text: app.strings.dialogs.cancel || "Cancel",
          keyCodes: [27]
        },
        {
          text: app.strings.dialogs.delete || "Delete",
          keyCodes: [13],
          onClick: () => {
            app.RecipeEditor.recipe.items.splice(item.index, 1);
            app.RecipeEditor.renderItems();
            app.RecipeEditor.renderNutrition();
          }
        }
      ]
    }).open();
  },

  save: async function() {
    if (app.f7.input.validateInputs("#recipe-edit-form") == true) {

      let data = {};

      if (app.RecipeEditor.recipe.id !== undefined) data.id = app.RecipeEditor.recipe.id;
      if (app.RecipeEditor.recipe.items !== undefined) data.items = app.RecipeEditor.recipe.items;

      data.dateTime = new Date();

      let inputs = document.querySelectorAll(".page[data-name='recipe-editor'] input, .page[data-name='recipe-editor'] textarea");

      inputs.forEach((x) => {
        if (x.value !== undefined && x.value != "")
          data[x.name] = x.value;
      });

      let categories = app.FoodsMealsRecipes.getSelectedCategories(app.RecipeEditor.el.categories);
      if (categories !== undefined)
        data.categories = categories;

      // Array index should not be saved with items
      if (data.items !== undefined) {
        data.items.forEach((x) => {
          if (x.index !== undefined)
            delete x.index;
        });
      }

      if (app.RecipeEditor.recipe.items !== undefined)
        data.nutrition = await app.FoodsMealsRecipes.getTotalNutrition(app.RecipeEditor.recipe.items);

      dbHandler.put(data, "recipes").onsuccess = () => {
        app.f7.views.main.router.navigate("/foods-meals-recipes/recipes/");
      };
    }
  },

  replaceListItem: function(item) {
    let updatedItem = app.FoodsMealsRecipes.flattenItem(item);
    app.RecipeEditor.recipe.items.splice(item.index, 1, updatedItem);
  },

  renderNutrition: async function() {
    const nutrition = await app.FoodsMealsRecipes.getTotalNutrition(app.RecipeEditor.recipe.items);

    const nutriments = app.Settings.get("nutriments", "order") || app.nutriments;
    const units = app.Nutriments.getNutrimentUnits();

    const ul = app.RecipeEditor.el.nutrition;
    ul.innerHTML = "";

    nutriments.forEach((x) => {

      if (nutrition[x] == undefined || nutrition[x] == 0) return;

      let unit = app.strings["unit-symbols"][units[x]] || units[x];

      let li = document.createElement("li");
      li.className = "item-content item-input";
      ul.appendChild(li);

      let innerDiv = document.createElement("div");
      innerDiv.className = "item-inner";
      li.appendChild(innerDiv);

      let title = document.createElement("div");
      title.className = "item-title item-label";
      let text = app.strings.nutriments[x] || x;
      title.innerText = app.Utils.tidyText(text, 25);
      if (unit !== undefined)
        title.innerText += " (" + unit + ")";
      innerDiv.appendChild(title);

      let after = document.createElement("div");
      after.className = "item-after nutrition-field";
      after.id = x;
      after.innerText = Math.round(nutrition[x] * 100) / 100;
      innerDiv.appendChild(after);
    });

    app.FoodsMealsRecipes.setNutritionFieldsVisibility(ul, app.RecipeEditor.el.nutritionButton, false);
  },

  renderItems: function() {
    return new Promise(async function(resolve, reject) {
      app.RecipeEditor.el.foodlist.innerHTML = "";
      app.FoodsMealsRecipes.disableEdit = false;

      app.RecipeEditor.recipe.items.forEach(async (x, i) => {
        x.index = i;
        app.FoodsMealsRecipes.renderItem(x, app.RecipeEditor.el.foodlist, false, undefined, app.RecipeEditor.removeItem);
      });

      resolve();
    });
  }
};

document.addEventListener("page:init", function(event) {
  if (event.detail.name == "recipe-editor") {
    let context = app.data.context;
    app.data.context = undefined;

    // Clear old recipe
    app.RecipeEditor.recipe = {
      items: []
    };

    app.RecipeEditor.init(context);
  }
});

document.addEventListener("page:reinit", function(event) {
  if (event.detail.name == "recipe-editor") {
    let context = app.data.context;
    app.data.context = undefined;
    app.RecipeEditor.init(context);
  }
});