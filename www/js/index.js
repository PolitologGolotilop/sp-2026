let ProductListInstance = null
let ProductModalInstance = null
let WorkshopModalInstance = null

async function get(route){
    const response = await fetch(route, {
            method:"GET"
    })

    if(response.ok){
        let data = await response.json()

        console.log(typeof data)

        return JSON.parse(data)
    }

    console.error(`Не удалось обратится к ${route}`)
}

class ProductList{
    constructor(containerId){
        this.initialized = false
        this.container = document.getElementById(containerId);
    }

    async init(){
        this.products = await this.getProducts()
        this.initialized = true
    }

    render(){
        if(!this.initialized){
            console.warn("ProductList еще не инициализирован")
            return
        }

        this.container.innerHTML = ""

        this.products.forEach(product=>{
            const itemDiv = document.createElement('div');
            itemDiv.className = 'product-item';

            const productName = document.createElement("span")
            productName.className = "product-name"
            productName.innerText = product.name

            const viewBtn = document.createElement("span")
            viewBtn.className = "material-symbols-outlined"
            viewBtn.textContent = "remove_red_eye"
            viewBtn.setAttribute("productId", product.id)

            viewBtn.onclick = (e) => {
                e.stopPropagation();
                const id = viewBtn.getAttribute('productId');
                const product = this.products.find(p => p.id == id);
                console.log(ProductModalInstance)
                if (product){
                    ProductModalInstance.init(product)
                    ProductModalInstance.open();
                }
            }

            itemDiv.appendChild(productName)
            itemDiv.appendChild(viewBtn)

            this.container.appendChild(itemDiv);
        })
    }

    async getProducts(){
        return await get("/products")
    }
}

class ProductModal{
    constructor(){
        this.saveBtn = document.getElementById('saveProductBtn')
        this.nameInput = document.getElementById('productNameInput')
        this.overlay = document.getElementById('productModal')
        this.workshopsContainer = document.getElementById('workshopTagsContainer');
        this.addWorkshopBtn = document.getElementById("openAddWorkshopBtn")
        this.initialized = false
    }

    init(product){
        this.product = product
        this.changed = false
        this.workshops = product.workshops.slice()

        this.saveBtn.onclick = () => {this.claimChanges()}
        this.nameInput.oninput = () => {this.checkChanges(this.product)}
        this.overlay.onclick = (e) => {
            if(e.target==this.overlay){
                this.close()
            }
        }
        this.nameInput.value = product.name
        this.addWorkshopBtn.onclick = async () => {
            await WorkshopModalInstance.init(this.workshops)
            WorkshopModalInstance.open()
        }

        this.initialized = true

        this.renderWorkshops()
    }

    renderWorkshops(){
        this.checkChanges()
        this.workshopsContainer.innerHTML = '';
        if (!this.workshops || this.workshops.length === 0) {
            this.workshopsContainer.innerHTML = '<span class="placeholder-text">нет привязанных цехов</span>';
            return;
        }

        this.workshops.forEach(ws => {
            const tag = document.createElement('span');
            tag.className = 'workshop-tag';
            tag.innerText = ws.name

            const removeBtn = document.createElement("span")
            removeBtn.className = "material-symbols-outlined"
            removeBtn.textContent = "delete"
            removeBtn.style = "cursor:pointer"
            removeBtn.setAttribute("wsId", ws.id)
            removeBtn.onclick = (e) => {
                e.stopPropagation();
                this.workshops = this.workshops.filter(s=>s.id!=removeBtn.getAttribute("wsId"))
                this.renderWorkshops()
            }

            tag.appendChild(removeBtn)
            this.workshopsContainer.appendChild(tag);
        });
    }

    open(){
        if(!this.initialized){
            console.warn("ProductModal еще не инициализирован")
            return
        }

        this.overlay.classList.add("active")
    }

    checkChanges(){
        function haveSameElements(a, b) {
            if (a.length !== b.length) return false;
            
            const sortedA = [...a].sort((a, b) => 
                a.name.localeCompare(b.name));
            
            const sortedB = [...b].sort((a, b) => 
                a.name.localeCompare(b.name)
            );
            
            return sortedA.every((value, index) => value.name == sortedB[index].name && value.id==sortedB[index].id && sortedB[index].address==value.address);
        }

        this.changed = this.product.name.trim() != this.nameInput.value.trim() || !haveSameElements(this.product.workshops, this.workshops)

        if(!this.changed){
            this.saveBtn.innerText = "Ок"
        }
        else{
            this.saveBtn.innerText = "Сохранить"
        }
    }

    claimChanges(){
        if(this.changed){
            alert("Здесь логика отправки на сервак")
        }
        else{
            this.hide()
        }
    }

    close(){
        if(this.changed){
            const choice = confirm("У вас есть не сохраненные изменения для этого продукта. Все равно выйти?")

            if(!choice){
                return
            }
        }

        this.overlay.classList.remove("active")
    }
}

class WorkshopsModal{
    constructor(){
        this.overlay = document.getElementById("addWorkshopModal")
        this.selectedWorkshop = null
        this.select = document.getElementById('workshopSelect');
        this.initialized = false
        this.cancelBtn = document.getElementById("cancelWorkshopBtn")
        this.saveBtn = document.getElementById("addWorkshopConfirmBtn")

        this.overlay.onclick = (e) => {
            if(e.target==this.overlay){
                this.close()
            }
        }

        this.cancelBtn.onclick = () => {this.close()}
        this.saveBtn.onclick = () => {this.save()}
    }

    async init(currentWorkshops){
        this.currentWorkshops = currentWorkshops

        const allWorkshops = await this.getWorkshops()
        this.available = allWorkshops.filter(s=>!this.currentWorkshops.map(c=>c.name).includes(s.name))

        this.initialized = true
    }

    open(){
        if(!this.initialized ){
            console.warn("WorkshopsModal еще не инициализирован")
            return
        }

        this.overlay.classList.add("active")
        this.select.innerHTML = '';

        if (this.available.length === 0) {
            const option = document.createElement('option');
            option.disabled = true;
            option.selected = true;
            option.textContent = '— все цеха уже добавлены —';
            this.select.appendChild(option);
        } 
        else {
            this.available.forEach(ws => {
                const option = document.createElement('option');
                option.value = ws.id;
                option.textContent = ws.name;
                this.select.appendChild(option);
            });
        }
    }

    close(){
        this.overlay.classList.remove("active")
    }

    async getWorkshops(){
        return await get("/workshops")
    }

    save(){
        const selected = this.select.value
        this.currentWorkshops.push(this.available.find(s=>s.id==selected))

        this.close()
        ProductModalInstance.renderWorkshops()
    }
}

async function initProductList() {
    ProductListInstance = new ProductList("productListContainer")
    await ProductListInstance.init()
    ProductListInstance.render()

    ProductModalInstance = new ProductModal()
    WorkshopModalInstance = new WorkshopsModal()
}