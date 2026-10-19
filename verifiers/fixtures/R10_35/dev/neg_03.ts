import { Injectable } from '@nestjs/common';
import { paginate } from '@/shared/pagination';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '@/models/product';

@Injectable()
export class ProductService {
  constructor(@InjectRepository(Product) private readonly repo: Repository<Product>) {}

  list(page: number) {
    return paginate(this.repo, page, 20);
  }
}
