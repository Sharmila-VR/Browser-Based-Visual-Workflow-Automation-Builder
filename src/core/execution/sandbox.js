export function executeSandboxedCode(code, context = {}, timeoutMs = 2000) {
  return new Promise((resolve, reject) => {
    if (typeof Worker === 'undefined' || typeof Blob === 'undefined' || typeof URL === 'undefined') {
      try {
        const fn = new Function('$input', '$node', '$env', code)
        const result = fn(context.$input, context.$node, context.$env)
        resolve(result)
      } catch (err) {
        reject(err)
      }
      return
    }

    const workerSource = `
      self.onmessage = function(e) {
        var data = e.data;
        var code = data.code;
        var context = data.context;
        try {
          var runner = new Function('$input', '$node', '$env', code);
          var result = runner(context.$input, context.$node, context.$env);
          self.postMessage({ success: true, result: result });
        } catch (err) {
          self.postMessage({ success: false, error: err.message });
        }
      };
    `

    const blob = new Blob([workerSource], { type: 'application/javascript' })
    const workerUrl = URL.createObjectURL(blob)
    const worker = new Worker(workerUrl)

    let isCompleted = false

    const timer = setTimeout(() => {
      if (!isCompleted) {
        isCompleted = true
        worker.terminate()
        URL.revokeObjectURL(workerUrl)
        reject(new Error(`Execution timed out after ${timeoutMs}ms. Infinite loop terminated safely.`))
      }
    }, timeoutMs)

    worker.onmessage = (event) => {
      if (isCompleted) return
      isCompleted = true
      clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(workerUrl)

      if (event.data.success) {
        resolve(event.data.result)
      } else {
        reject(new Error(event.data.error))
      }
    }

    worker.onerror = (err) => {
      if (isCompleted) return
      isCompleted = true
      clearTimeout(timer)
      worker.terminate()
      URL.revokeObjectURL(workerUrl)
      reject(new Error(err.message || 'Worker runtime error'))
    }

    worker.postMessage({ code, context })
  })
}
