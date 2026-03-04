let ProductListInstance = null
let ProductModalInstance = null
let WorkshopModalInstance = null

async function fetch_with_body(route, method, dict){
    const response = await fetch(route, 
        {
        method: method,
        headers: {
        'Content-Type': 'application/json',
        },
        body:JSON.stringify(dict)
    })

    return response
}

async function parse_data(response) {
    const data = await response.json()

    return JSON.parse(data)
}

function log_route_error(route, method) {
    console.error(`Не удалось обратится к ${route}. Метод ${method}`)
}

async function get(route){
    const method = "GET"
    const response = await fetch(route, {
        method:method
    })

    if(response.ok){
        return await parse_data(response)
    }

    log_route_error(route, method)
}

async function send_to_server(route, dict, method = "POST"){
    console.log(dict)
    const response = await fetch_with_body(route, method, dict)

    if(response.ok){
        return await parse_data(response)
    }

    log_route_error(route, method)
}

class ProductList{
    constructor(containerId){
        this.initialized = false
        this.container = document.getElementById(containerId);
        this.addBtn = document.getElementById("openAddProductModal")

        this.addBtn.onclick = () => {
            ProductModalInstance.init(null)
            ProductModalInstance.open()
        }
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

        function div_text_icon(text, iconName){
            const div = document.createElement("div")
            div.style = "display: flex; gap: 10px; padding-top:10px"

            const textContent = document.createElement("span")
            textContent.innerText = text

            const icon = document.createElement("span")
            icon.className = "material-symbols-outlined"
            icon.textContent = iconName

            div.append(textContent)
            div.append(icon)

            return div
        }

        this.container.innerHTML = ""

        this.products.sort((a,b) => a.id-b.id).forEach(product => {
            const itemDiv = document.createElement('div');
            itemDiv.className = 'product-item';

            const dataDiv = document.createElement("div")

            const productName = document.createElement("span")
            productName.className = "product-name"
            productName.innerText = `${product.production_type.type} | ${product.name}`

            dataDiv.appendChild(productName)
            dataDiv.appendChild(div_text_icon(product.article, "art_track"))
            dataDiv.appendChild(div_text_icon(product.min_price, "attach_money"))
            dataDiv.appendChild(div_text_icon(product.material_type.type, "tonality"))

            const btnsDiv = document.createElement("div")
            btnsDiv.style = "display:flex;gap:20px"

            const viewBtn = document.createElement("span")
            viewBtn.className = "material-symbols-outlined"
            viewBtn.textContent = "remove_red_eye"
            viewBtn.setAttribute("productId", product.id)

            viewBtn.onclick = (e) => {
                e.stopPropagation();
                const id = viewBtn.getAttribute('productId');
                const product = this.products.find(p => p.id == id);
                if (product){
                    ProductModalInstance.init(product)
                    ProductModalInstance.open();
                }
            }

            const deleteBtn = document.createElement("span")
            deleteBtn.className = "material-symbols-outlined"
            deleteBtn.textContent = "delete"
            deleteBtn.setAttribute("productId", product.id)
            deleteBtn.style.color = "#f19d9d"

            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                const id = parseInt(deleteBtn.getAttribute('productId'));
                
                const response = await fetch(`/products/${id}`, {
                    method: "DELETE",
                    headers: {
                        'Content-Type': 'application/json',
                    }
                });
                
                if(response.ok){
                    await ProductListInstance.init();
                    ProductListInstance.render();
                }
            }

            btnsDiv.appendChild(viewBtn)
            btnsDiv.append(deleteBtn)

            const left = document.createElement("div")
            left.id = "left"
            left.style = "display:flex; flex-direction:column; justify-content:space-between;height: -webkit-fill-available;"

            const time = document.createElement("span")
            time.innerText = `${product.production_time} ч.`
            time.style.fontSize = "25px"
            time.style.textAlign = "center"

            left.appendChild(time)
            left.appendChild(btnsDiv)

            itemDiv.appendChild(dataDiv)
            itemDiv.appendChild(left)

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
        console.log(product)
        this.newProduct = product==null

        this.product = product
        this.changed = this.newProduct

        this.workshops = this.newProduct? [] : product.workshops.slice()
        this.nameInput.oninput = this.newProduct? null : () => {this.checkChanges(this.product)}
        this.nameInput.value = this.newProduct? "" : product.name

        this.saveBtn.onclick = async () => {await this.claimChanges()}
        this.saveBtn.innerText = this.newProduct? 'Сохранить' : "Ок"

        this.overlay.onclick = (e) => {
            if(e.target==this.overlay){
                this.close()
            }
        }

        this.addWorkshopBtn.onclick = async () => {
            await WorkshopModalInstance.init(this.workshops)
            WorkshopModalInstance.open()
        }

        this.initialized = true

        this.renderWorkshops()
    }

    renderWorkshops(){
        if(!this.newProduct) this.checkChanges()

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

    async claimChanges(){
        if(this.changed){
            const prod_name = this.nameInput.value.trim()
            const workshops = this.workshops? this.workshops.map(s=>s.id) : []
            const dict = {"name":prod_name, "workshops_ids":workshops}

            if(this.newProduct){
                await send_to_server("/products", dict)
            }
            else{
                await send_to_server("/products", {"id":this.product.id, product: dict}, "PATCH")
            }
            
            this.changed = false
            await ProductListInstance.init()
            ProductListInstance.render()
            this.close()
        }
        else{
            this.close()
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