def moving_average(values, window):
    """Compute the moving average of a sequence.

    Parameters
    ----------
    values : list of float
        Input samples.
    window : int
        Size of the averaging window.

    Returns
    -------
    list of float
        The averaged samples.
    """
    return [sum(values[i:i + window]) / window
            for i in range(len(values) - window + 1)]
