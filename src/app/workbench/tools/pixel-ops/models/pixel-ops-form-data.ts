
export enum KernelFilter {
    MEDIAN_FILTER = 'median_filter',
    MAXIMUM_FILTER = 'maximum_filter',
    MINIMUM_FILTER = 'minimum_filter',
    UNIFORM_FILTER = 'uniform_filter',
    GREY_CLOSING = 'grey_closing',
    GREY_DILATION = 'grey_dilation',
    GREY_EROSION = 'grey_erosion',
    GREY_OPENING = 'grey_opening',
    MORPHOLOGICAL_GRADIENT = 'morphological_gradient',
    MORPHOLOGICAL_LAPLACE = 'morphological_laplace',
    BLACK_TOPHAT = 'black_tophat',
    WHITE_TOPHAT = 'white_tophat',
    GAUSSIAN_FILTER = 'gaussian_filter',
    GAUSSIAN_GRADIENT_MAGNITUDE = 'gaussian_gradient_magnitude',
    GAUSSIAN_LAPLACE = 'gaussian_laplace',
    LAPLACE = 'laplace',
    PREWITT = 'prewitt',
    SOBEL = 'sobel'
}

export const NO_ARG_KERNELS = [KernelFilter.LAPLACE, KernelFilter.PREWITT, KernelFilter.SOBEL]
export const SIZE_KERNELS = [KernelFilter.MEDIAN_FILTER, KernelFilter.MAXIMUM_FILTER, KernelFilter.MINIMUM_FILTER, KernelFilter.UNIFORM_FILTER,
KernelFilter.GREY_CLOSING, KernelFilter.GREY_DILATION, KernelFilter.GREY_EROSION, KernelFilter.GREY_OPENING, KernelFilter.MORPHOLOGICAL_GRADIENT, KernelFilter.MORPHOLOGICAL_LAPLACE,
KernelFilter.BLACK_TOPHAT, KernelFilter.WHITE_TOPHAT]
export const SIGMA_KERNELS = [KernelFilter.GAUSSIAN_FILTER, KernelFilter.GAUSSIAN_GRADIENT_MAGNITUDE, KernelFilter.GAUSSIAN_LAPLACE]



export interface PixelOpsFormData {
    operand: '+' | '-' | '/' | '*';
    mode: 'scalar' | 'image' | 'kernel';
    selectedLayerIds: string[];
    primaryLayerIds: string[];
    auxLayerId: string;
    auxLayerIds: string[];
    scalarValue: number;
    kernelFilter: KernelFilter;
    kernelSize: number;
    kernelSigma: number;
    inPlace: boolean;
    opString: string;
}